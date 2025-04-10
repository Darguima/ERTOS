import paho.mqtt.client as mqtt
import json
import time
import math
import random

BROKER = "localhost"
PORT = 1883
TOPIC = "sensor/wattage_meter_rt_c_component"

# One hour will take SECONDS_PER_HOUR seconds to pass
# 3600 to a real time simulation (on UTC+0)
SECONDS_PER_HOUR = 10

def get_fake_hour():
    current_second = time.time()
    fake_hour = int(current_second / SECONDS_PER_HOUR) % 24

    print(f"Current hour: {fake_hour}")

    return fake_hour

def getFakeData():
    hour = get_fake_hour()

    # Use sine waves to simulate daily patterns
    # Power consumption: peaks at 8 AM and 6 PM
    # Solar production: peaks at noon

    consumption_wattage = 200 + 150 * (
        math.exp(-((hour - 8) ** 2) / 10) + math.exp(-((hour - 18) ** 2) / 10)
    )
    production_wattage = max(0, 300 * math.sin((hour - 6) / 12 * math.pi))

    # Add a bit of randomness
    consumption_wattage += random.uniform(-20, 20)
    production_wattage += random.uniform(-30, 30)

    return {
        "consumption_wattage": consumption_wattage,
        "production_wattage": production_wattage,
    }

mqttc = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

mqttc.connect(BROKER, PORT, 60)
mqttc.loop_start()

try:
    while True:
        data = getFakeData()

        msg_info = mqttc.publish(TOPIC, json.dumps(data))
        msg_info.wait_for_publish()

        print(f"Published: {data}")
        time.sleep(1)

except KeyboardInterrupt:
    ...

# Close the MQTT connection
finally:
    print("Exiting...")
    mqttc.disconnect()
    mqttc.loop_stop()

