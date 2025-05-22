#!/usr/bin/env python3

import argparse
import paho.mqtt.client as mqtt
from firebase import firebase
import json
import time

# Default MQTT settings
DEFAULT_BROKER = "localhost"
DEFAULT_PORT = 1883
TOPIC_SOLAR_PANEL = "sensor/solar_panel_rpi"
TOPIC_WATTAGE_METER = "sensor/wattage_meter_rt_c_component"

FIREBASE_URL = "https://erts-pr-default-rtdb.europe-west1.firebasedatabase.app/"

firebase = firebase.FirebaseApplication(FIREBASE_URL, None)

last_solar_panel_message = None
last_wattage_meter_message = None

# Receive Terminal Arguments
parser = argparse.ArgumentParser(description="MQTT Handler for Solar Energy Monitoring")
parser.add_argument("house_id", help="House ID for identifying the data source")
parser.add_argument("broker", nargs="?", default=DEFAULT_BROKER, help="MQTT broker address (default: localhost)")
parser.add_argument("port", nargs="?", type=int, default=DEFAULT_PORT, help="MQTT broker port (default: 1883)")
args = parser.parse_args()

HOUSE_ID = args.house_id
BROKER = args.broker
PORT = args.port

print(f"Using MQTT Broker: {BROKER}:{PORT}")

def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code.is_failure:
        print(f"Failed to connect: {reason_code}. loop_forever() will retry connection")
    else:
        print(f"Connected with result code {reason_code}")
        client.subscribe(TOPIC_SOLAR_PANEL)
        client.subscribe(TOPIC_WATTAGE_METER)

def on_subscribe(client, userdata, mid, reason_code_list, properties):
    # Since we subscribed only for a single channel, reason_code_list contains
    # a single entry
    if reason_code_list[0].is_failure:
        print(f"Broker rejected you subscription: {reason_code_list[0]}")
    else:
        print(f"Broker granted the following QoS: {reason_code_list[0].value}")

def on_unsubscribe(client, userdata, mid, reason_code_list, properties):
    if len(reason_code_list) == 0 or not reason_code_list[0].is_failure:
        print("unsubscribe succeeded (if SUBACK is received in MQTTv3 it success)")
    else:
        print(f"Broker replied with failure: {reason_code_list[0]}")
    client.disconnect()

def on_message(client, userdata, msg):
    global last_solar_panel_message, last_wattage_meter_message
    if msg.topic == TOPIC_SOLAR_PANEL:
      try:
          received_data = json.loads(msg.payload.decode())
          last_solar_panel_message = received_data

      except json.JSONDecodeError:
          print("\nFailed to decode solar_panel_rpi JSON payload")

    if msg.topic == TOPIC_WATTAGE_METER:
      try:
          received_data = json.loads(msg.payload.decode())
          last_wattage_meter_message = received_data

      except json.JSONDecodeError:
          print("\nFailed to decode wattage_meter JSON payload")
    
    if last_solar_panel_message is None:
        print("\nWaiting for more Solar Panel messages...")
        return

    if last_wattage_meter_message is None:
        print("\nWaiting for more Wattage Meter messages...")
        return

    full_message = {
        "humidity": last_solar_panel_message["humidity"],
        "temperature": last_solar_panel_message["temperature"],
        "consumption_wattage": last_wattage_meter_message["consumption_wattage"],
        "production_wattage": last_wattage_meter_message["production_wattage"],

        "timestamp": int(time.time()),
    }

    last_solar_panel_message = None
    last_wattage_meter_message = None

    result = firebase.post(f"houses/{HOUSE_ID}", full_message)
    print(f"\nStored data ({result["name"]}) on firebase:\n{json.dumps(full_message, indent=4)}")

mqttc = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

mqttc.on_connect = on_connect
mqttc.on_subscribe = on_subscribe
mqttc.on_unsubscribe = on_unsubscribe
mqttc.on_message = on_message

mqttc.connect(BROKER, PORT, 60)

try:
    mqttc.loop_forever()
except KeyboardInterrupt:
    ...
finally:
    print("Exiting...")
    mqttc.disconnect()
