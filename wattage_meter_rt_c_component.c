#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>

#include <mosquitto.h>

#include <signal.h>
#include <sched.h>
#include <pthread.h>

#include <unistd.h> // we cant use this lib

// MQTT settings
#define BROKER_ADDRESS "localhost"
#define BROKER_PORT 1883
#define TOPIC "sensor/wattage_meter_rt_c_component"
#define QOS 1
#define CLIENT_ID "wattage_meter_rt_c"

// Simulation settings
#define SECONDS_PER_HOUR 10 // One hour will take SECONDS_PER_HOUR seconds to pass

// Global variables
struct mosquitto *mosq = NULL;
volatile int running = 1;

// Signal handler for graceful termination
void handle_signal(int s)
{
  running = 0;
}

// Get fake hour for simulation
int get_fake_hour()
{
  time_t current_second = time(NULL);
  int fake_hour = (int)(current_second / SECONDS_PER_HOUR) % 24;

  printf("Current hour: %d\n", fake_hour);

  return fake_hour;
}

// Generate fake wattage data
void get_fake_data(double *consumption_wattage, double *production_wattage)
{
  int hour = get_fake_hour();

  // Use sine waves to simulate daily patterns
  // Power consumption: peaks at 8 AM and 6 PM
  // Solar production: peaks at noon

  *consumption_wattage =
      200 + 150 * (exp(-pow(hour - 8, 2) / 10.0) +
                   exp(-pow(hour - 18, 2) / 10.0));

  *production_wattage =
      300 * sin(((hour - 6) / 12.0) * M_PI);

  // Add a bit of randomness
  *consumption_wattage += ((rand() % 4001) / 100.0) - 20.0; // [-20, +20]
  *production_wattage += ((rand() % 6001) / 100.0) - 30.0;  // [-30, +30]

  // No production at night
  if (hour > 22 && hour < 6)
  {
    *production_wattage = 0;
  }

  // No negative production
  if (*production_wattage < 0)
  {
    *production_wattage = 0;
  }
}

// MQTT connection callback
void on_connect(struct mosquitto *mosq, void *obj, int reason_code)
{
  if (reason_code != 0)
  {
    printf("Failed to connect to MQTT broker: %s\n", mosquitto_connack_string(reason_code));
    running = 0;
  }
  else
  {
    printf("Connected to MQTT broker successfully\n");
  }
}

// MQTT publish callback
void on_publish(struct mosquitto *mosq, void *obj, int mid)
{
  // printf("Message published successfully (mid: %d)\n", mid);
}

// Set real-time scheduling priority
int set_rt_priority()
{
  struct sched_param param;
  int policy = SCHED_FIFO;
  int max_priority;

  max_priority = sched_get_priority_max(policy);
  if (max_priority == -1)
  {
    perror("sched_get_priority_max");
    return -1;
  }

  param.sched_priority = max_priority;
  if (pthread_setschedparam(pthread_self(), policy, &param) != 0)
  {
    perror("pthread_setschedparam");
    printf("Failed to set real-time priority. Are you running as root?\n");
    return -1;
  }

  printf("Successfully set real-time priority\n");
  return 0;
}

timer_t timerID;
char json_buffer[256];
int rc;

void handlerTimer(int signalnumber, siginfo_t *si, void *uc)
{
  double consumption_wattage, production_wattage;

  // Get simulated data
  get_fake_data(&consumption_wattage, &production_wattage);

  // Create JSON message
  snprintf(json_buffer, sizeof(json_buffer),
           "{\"consumption_wattage\": %.2f, \"production_wattage\": %.2f}",
           consumption_wattage, production_wattage);

  // Publish message
  rc = mosquitto_publish(mosq, NULL, TOPIC, strlen(json_buffer), json_buffer, QOS, false);
  if (rc != MOSQ_ERR_SUCCESS)
  {
    fprintf(stderr, "Error publishing: %s\n", mosquitto_strerror(rc));
  }
  else
  {
    printf("Published: %s\n", json_buffer);
  }
}

int main()
{

  // Set up signal handling for graceful termination
  signal(SIGINT, handle_signal);
  signal(SIGTERM, handle_signal);

  // Initialize random seed
  srand(time(NULL));

  // Set real-time priority
  set_rt_priority();

  // Initialize mosquitto library
  mosquitto_lib_init();

  // Create a new mosquitto client instance
  mosq = mosquitto_new(CLIENT_ID, true, NULL);
  if (!mosq)
  {
    fprintf(stderr, "Error: Out of memory.\n");
    return 1;
  }

  // Set callbacks
  mosquitto_connect_callback_set(mosq, on_connect);
  mosquitto_publish_callback_set(mosq, on_publish);

  // Connect to broker
  rc = mosquitto_connect(mosq, BROKER_ADDRESS, BROKER_PORT, 60);
  if (rc != MOSQ_ERR_SUCCESS)
  {
    fprintf(stderr, "Unable to connect to broker: %s\n", mosquitto_strerror(rc));
    mosquitto_destroy(mosq);
    mosquitto_lib_cleanup();
    return 1;
  }

  // Start the network loop in a background thread
  rc = mosquitto_loop_start(mosq);
  if (rc != MOSQ_ERR_SUCCESS)
  {
    fprintf(stderr, "Unable to start loop: %s\n", mosquitto_strerror(rc));
    mosquitto_destroy(mosq);
    mosquitto_lib_cleanup();
    return 1;
  }

  printf("Wattage Meter RT C Component started\n");
  printf("Press Ctrl+C to exit\n");

  // CREATE TIMER WITH RT SIGNAL
  struct sigevent sigev;
  sigev.sigev_notify = SIGEV_SIGNAL;
  sigev.sigev_signo = SIGRTMIN + 4;
  sigev.sigev_value.sival_ptr = &timerID; // Passing the timer's ID for the sigactionHandler

  // 1. parameter: The timer will use this clock
  // 2. parameter: Raised sigevent on expiration (NULL means SIGALRM)
  // 3. parameter: The generated timer's ID
  if (timer_create(CLOCK_REALTIME, &sigev, &timerID))
  {
    perror("Failed to create Timer");
    exit(1);
  }

  // Register signal handler
  struct sigaction sigact;
  sigemptyset(&sigact.sa_mask); // no blocked signals only the one, which arrives
  sigact.sa_sigaction = handlerTimer;
  sigact.sa_flags = SA_SIGINFO;
  sigaction(SIGRTMIN + 4, &sigact, NULL); // an alarm signal is set

  struct itimerspec timer;
  timer.it_interval.tv_sec = 1;  // it will be repeated after 3 seconds
  timer.it_interval.tv_nsec = 0; // nsec - nanoseconds - 10^(-9) seconds
  timer.it_value.tv_sec = 3;     // remaining time till expiration
  timer.it_value.tv_nsec = 0;

  // 1. parameter: timer to arm
  // 2. parameter: 0 - relative timer, TIMER_ABSTIME - absolute timer
  // 3. parameter: expiration and interval settings to be used
  // 4. parameter: previous timer settings (if needed)
  timer_settime(timerID, 0, &timer, NULL);

  while (running)
    ;

  // Clean up
  mosquitto_loop_stop(mosq, true);
  mosquitto_disconnect(mosq);
  mosquitto_destroy(mosq);
  mosquitto_lib_cleanup();

  printf("Wattage Meter RT C Component stopped\n");

  return 0;
}