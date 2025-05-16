#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <math.h>
#include "MQTTClient.h"

#include <unistd.h> // we cant use this lib

#define ADDRESS "tcp://localhost:1883"
#define CLIENTID "wattage_meter_client"
#define TOPIC "sensor/wattage_meter_rt_c_component"
#define QOS 0
#define TIMEOUT 10000L

#define SECONDS_PER_HOUR 10

typedef struct
{
    double consumption_wattage;
    double production_wattage;
} PowerData;

int get_fake_hour()
{
    time_t current_second = time(NULL);
    int fake_hour = (current_second / SECONDS_PER_HOUR) % 24;

    printf("Current hour: %d\n", fake_hour);

    return fake_hour;
}

PowerData getFakeData()
{
    int hour = get_fake_hour();

    // Use sine waves to simulate daily patterns
    // Power consumption: peaks at 8 AM and 6 PM
    // Solar production: peaks at noon

    double consumption_wattage =
        200 + 150 * (exp(-pow(hour - 8, 2) / 10.0) +
                     exp(-pow(hour - 18, 2) / 10.0));

    double production_wattage =
        300 * sin(((hour - 6) / 12.0) * M_PI);

    // Add a bit of randomness
    consumption_wattage += ((rand() % 4001) / 100.0) - 20.0; // [-20, +20]
    production_wattage += ((rand() % 6001) / 100.0) - 30.0;  // [-30, +30]

    // No production at night
    if (hour > 22 && hour < 6)
    {
        production_wattage = 0;
    }

    // No negative production
    if (production_wattage < 0)
    {
        production_wattage = 0;
    }

    PowerData data = {consumption_wattage, production_wattage};
    return data;
}

int main(int argc, char *argv[])
{
    srand(time(NULL)); // Seed only once per run

    MQTTClient client;
    MQTTClient_connectOptions conn_opts = MQTTClient_connectOptions_initializer;
    int rc;

    MQTTClient_create(&client, ADDRESS, CLIENTID,
                      MQTTCLIENT_PERSISTENCE_NONE, NULL);
    conn_opts.keepAliveInterval = 20;
    conn_opts.cleansession = 1;

    if ((rc = MQTTClient_connect(client, &conn_opts)) != MQTTCLIENT_SUCCESS)
    {
        printf("Failed to connect, return code %d\n", rc);
        exit(EXIT_FAILURE);
    }

    while (1)
    {
        PowerData data = getFakeData();

        char payload[128];
        snprintf(payload, sizeof(payload),
                 "{"
                 "\"consumption_wattage\": %.5f,"
                 "\"production_wattage\": %.5f"
                 "}",
                 data.consumption_wattage, data.production_wattage);

        MQTTClient_message pubmsg = MQTTClient_message_initializer;
        pubmsg.payload = (void *)payload;
        pubmsg.payloadlen = (int)strlen(payload);
        pubmsg.qos = QOS;
        pubmsg.retained = 0;

        MQTTClient_deliveryToken token;
        MQTTClient_publishMessage(client, TOPIC, &pubmsg, &token);
        rc = MQTTClient_waitForCompletion(client, token, TIMEOUT);

        printf("Published: %s\n", payload);
        sleep(1);
    }

    MQTTClient_disconnect(client, 10000);
    MQTTClient_destroy(&client);

    return rc;
}
