#!/usr/bin/env python3

import paho.mqtt.client as mqtt
import json
import time
import math
import random
import argparse

SENSE_HAT = True
try:
    from sense_hat import SenseHat
except Exception:
    print("⚠️ \033[91mSenseHat not found, using fake data\033[0m ⚠️")
    SENSE_HAT = False

# Default MQTT settings
DEFAULT_BROKER = "localhost"
DEFAULT_PORT = 1883
TOPIC = "sensor/solar_panel_rpi"

# Parse command-line arguments
parser = argparse.ArgumentParser(description="Solar Panel MQTT Publisher")
parser.add_argument("broker", nargs="?", default=DEFAULT_BROKER, help="MQTT broker address (default: localhost)")
parser.add_argument("port", nargs="?", type=int, default=DEFAULT_PORT, help="MQTT broker port (default: 1883)")
args = parser.parse_args()

BROKER = args.broker
PORT = args.port

print(f"Using MQTT Broker: {BROKER}:{PORT}");

def getSenseHatData():
    hour = time.localtime().tm_hour

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

        print(f"Published:\n{json.dumps(data, indent=4)}\n")
        time.sleep(1)

except KeyboardInterrupt:
    ...

# Close the MQTT connection
finally:
    print("Exiting...")
    mqttc.disconnect()
    mqttc.loop_stop()
