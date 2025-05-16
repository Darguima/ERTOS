#!/usr/bin/env python3

import paho.mqtt.client as mqtt
import json
import time
import math
import random

SENSE_HAT = True
try:
    from sense_hat import SenseHat
except Exception:
    print("⚠️ \033[91mSenseHat not found, using fake data\033[0m ⚠️")
    SENSE_HAT = False

BROKER = "localhost"
PORT = 1883
TOPIC = "sensor/solar_panel_rpi"

# One hour will take SECONDS_PER_HOUR seconds to pass
# 3600 to a real time simulation (on UTC+0)
SECONDS_PER_HOUR = 10

def get_fake_hour():
    current_second = time.time()
    fake_hour = int(current_second / SECONDS_PER_HOUR) % 24

    print(f"Current hour: {fake_hour}")

    return fake_hour

def getSenseHatData():
    hour = get_fake_hour()

    if SENSE_HAT:
        sense = SenseHat()
        temperature = sense.get_temperature()
        humidity = sense.get_humidity()
    # Fallback to fake data if SenseHat is not available
    else:
        # Use sine waves to simulate daily patterns
        # Temp: min at 5 AM, max at 3 PM
        # Humidity: higher at night, lower during the day
        temperature = 10 + 10 * math.sin((hour - 5) / 24 * 2 * math.pi)
        humidity = 70 - 20 * math.sin((hour - 2) / 24 * 2 * math.pi)
    
        # Add a bit of randomness
        temperature += random.uniform(-1, 1)
        humidity += random.uniform(-3, 3)

    return {
        "humidity": humidity,
        "temperature": temperature,
    }

mqttc = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

mqttc.connect(BROKER, PORT, 60)
mqttc.loop_start()

try:
    while True:
        data = getSenseHatData()

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
