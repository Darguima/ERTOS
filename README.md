# Solar Panel Monitoring System

This project was developed to ERTOS subject on ELTE university.

## Create a virtual environment

```bash
$ python -m venv .venv
$ source .venv/bin/activate # every terminal session
```

## Install dependencies

This project depends on some Python libraries and **Mosquitto MQTT Broker**

```bash
# Install pyhton libraries
$ pip install -r requirements.txt
```

Check how to install [**Mosquitto MQTT Broker**](https://mosquitto.org/download/) on your system.

## Start the Mosquitto broker

The center of the project is the Mosquitto broker. It is responsible for receiving the data from the meters and sending it to the database.

```bash
$ mosquitto
```

## Start the meters

The project has 2 meters programs. The first responsible for reading the data from a Raspberry Pi SenseHat, and the other to read the data from a Wattage Meter (that is in reality faked with a Real Time C program).

The solar panel program should be run on a Raspberry Pi with the respective SenseHat in order to read the *temperature* and the *humidity*. The wattage meter program should be run on a computer and it will simulate the *consumption_wattage* and *production_wattage*.

```bash
$ python solar_panel_rpi.py 
$ python wattage_meter_rt_c_component.py
```

## Start MQTT handler

To receive the data from the meters and send it to the database, we need to run the MQTT handler. This program will subscribe to the topics of the meters and send the data to the Firebase database.

You should edit the file to place the correct Firebase URL of a Real Time database.

```bash
$ python mqtt_handler.py
```
