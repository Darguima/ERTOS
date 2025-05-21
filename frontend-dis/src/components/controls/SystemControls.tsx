import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Power, Zap, BatteryCharging, Settings, Save, Bell } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { toast as sonnerToast } from "sonner";
import { database } from '../../firebase/config';
import { ref, set, onValue } from 'firebase/database';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SystemControlsProps {
  houseId: string;
}

const SystemControls = ({ houseId }: SystemControlsProps) => {
  const { toast } = useToast();

  // System state
  const [systemEnabled, setSystemEnabled] = useState(true);

  // Production thresholds
  const [minProductionThreshold, setMinProductionThreshold] = useState(50);
  const [maxProductionThreshold, setMaxProductionThreshold] = useState(300);

  // Consumption settings
  const [maxConsumptionLimit, setMaxConsumptionLimit] = useState(250);
  const [consumptionAlertEnabled, setConsumptionAlertEnabled] = useState(true);

  // Maintenance settings
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [scheduledMaintenance, setScheduledMaintenance] = useState('');

  // Battery simulation
  const [batteryStorageEnabled, setBatteryStorageEnabled] = useState(false);
  const [batteryCapacity, setBatteryCapacity] = useState(80);

  // Threshold violation tracking
  const [belowMinProduction, setBelowMinProduction] = useState(false);
  const [aboveMaxProduction, setAboveMaxProduction] = useState(false);
  const [aboveMaxConsumption, setAboveMaxConsumption] = useState(false);
  const [currentProduction, setCurrentProduction] = useState(0);
  const [currentConsumption, setCurrentConsumption] = useState(0);
  const [lastAlertTime, setLastAlertTime] = useState<Record<string, number>>({
    minProduction: 0,
    maxProduction: 0,
    maxConsumption: 0
  });

  // Track which settings have been changed
  const [changedSettings, setChangedSettings] = useState<Record<string, boolean>>({
    production: false,
    consumption: false,
    battery: false,
    maintenance: false
  });

  // Update a setting and mark it as changed
  const updateSetting = <T,>(
    settingType: 'production' | 'consumption' | 'battery' | 'maintenance',
    setter: React.Dispatch<React.SetStateAction<T>>,
    value: T
  ) => {
    setter(value);
    setChangedSettings(prev => ({
      ...prev,
      [settingType]: true
    }));
  };

  // Save control settings to Firebase
  const saveControlSettings = async (settingType: string) => {
    try {
      const controlsRef = ref(database, `controls/${houseId}`);

      const settings = {
        system: {
          enabled: systemEnabled,
        },
        production: {
          minThreshold: minProductionThreshold,
          maxThreshold: maxProductionThreshold,
        },
        consumption: {
          maxLimit: maxConsumptionLimit,
          alertEnabled: consumptionAlertEnabled,
        },
        maintenance: {
          enabled: maintenanceMode,
          scheduledDate: scheduledMaintenance,
        },
        battery: {
          enabled: batteryStorageEnabled,
          capacity: batteryCapacity,
        },
        lastUpdated: new Date().toISOString(),
      };

      await set(controlsRef, settings);

      // Reset the changed flag for this setting type
      if (settingType !== 'System') {
        setChangedSettings(prev => ({
          ...prev,
          [settingType.toLowerCase()]: false
        }));
      }

      // Show visual feedback
      sonnerToast.success(`${settingType} settings saved`, {
        description: `Your ${settingType.toLowerCase()} settings have been updated successfully.`,
        position: 'bottom-right',
        duration: 3000,
      });

      // Show immediate effect message based on setting type
      let effectMessage = '';

      switch (settingType.toLowerCase()) {
        case 'production':
          effectMessage = 'Production thresholds updated. The system will now alert you based on the new thresholds.';
          break;
        case 'consumption':
          effectMessage = consumptionAlertEnabled 
            ? `Consumption limit set to ${maxConsumptionLimit}W. You'll be alerted if consumption exceeds this limit.`
            : 'Consumption alerts disabled. You will not receive alerts for high consumption.';
          break;
        case 'battery':
          effectMessage = batteryStorageEnabled
            ? `Battery simulation enabled with ${batteryCapacity}% capacity.`
            : 'Battery simulation disabled.';
          break;
        case 'maintenance':
          effectMessage = maintenanceMode
            ? 'Maintenance mode enabled. Alerts are temporarily suspended.'
            : 'Maintenance mode disabled. Normal monitoring resumed.';
          break;
      }

      if (effectMessage && settingType !== 'System') {
        setTimeout(() => {
          toast({
            title: "Setting Applied",
            description: effectMessage,
            duration: 5000,
          });
        }, 500);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Toggle system power
  const toggleSystem = () => {
    setSystemEnabled(!systemEnabled);
    toast({
      title: systemEnabled ? "System Disabled" : "System Enabled",
      description: systemEnabled 
        ? "The solar monitoring system has been disabled." 
        : "The solar monitoring system has been enabled.",
      duration: 3000,
    });
    saveControlSettings("System");
  };

  // Check if a threshold is violated and show notification if needed
  const checkThresholdViolation = (
    currentValue: number, 
    threshold: number, 
    isAboveThreshold: boolean,
    setViolationState: React.Dispatch<React.SetStateAction<boolean>>,
    alertType: 'minProduction' | 'maxProduction' | 'maxConsumption',
    alertTitle: string,
    alertMessage: string
  ) => {
    const thresholdViolated = isAboveThreshold 
      ? currentValue > threshold 
      : currentValue < threshold;

    setViolationState(thresholdViolated);

    // Only show notification if threshold is violated and we haven't shown one recently (within 5 minutes)
    const currentTime = Date.now();
    const alertCooldown = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (thresholdViolated && 
        systemEnabled && 
        (alertType !== 'maxConsumption' || consumptionAlertEnabled) &&
        currentTime - lastAlertTime[alertType] > alertCooldown) {

      // Update last alert time
      setLastAlertTime(prev => ({
        ...prev,
        [alertType]: currentTime
      }));

      // Show toast notification
      sonnerToast(alertTitle, alertMessage, {
        duration: 5000,
        position: 'top-right',
        icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      });
    }
  };

  // Listen for real-time data and check thresholds
  useEffect(() => {
    if (!systemEnabled || maintenanceMode) return;

    const dataRef = ref(database, `houses/${houseId}`);
    const dataQuery = ref(database, `houses/${houseId}`);

    const unsubscribe = onValue(dataQuery, (snapshot) => {
      if (!snapshot.exists()) return;

      // Get the most recent entry
      let latestData = null;
      let latestTimestamp = 0;

      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data.timestamp > latestTimestamp) {
          latestData = data;
          latestTimestamp = data.timestamp;
        }
      });

      if (!latestData) return;

      // Convert from watts to kilowatts for display consistency
      const production = latestData.production_wattage / 1000;
      const consumption = latestData.consumption_wattage / 1000;

      setCurrentProduction(production);
      setCurrentConsumption(consumption);

      // Check for threshold violations
      if (!maintenanceMode) {
        // Check minimum production threshold (during daylight hours)
        const hour = new Date().getHours();
        const isDaylight = hour >= 6 && hour <= 18; // Between 6 AM and 6 PM

        if (isDaylight) {
          checkThresholdViolation(
            production,
            minProductionThreshold / 1000, // Convert to kW
            false, // Below threshold
            setBelowMinProduction,
            'minProduction',
            'Low Production Alert',
            `Current production (${production.toFixed(2)} kW) is below the minimum threshold (${(minProductionThreshold / 1000).toFixed(2)} kW)`
          );
        }

        // Check maximum production threshold
        checkThresholdViolation(
          production,
          maxProductionThreshold / 1000, // Convert to kW
          true, // Above threshold
          setAboveMaxProduction,
          'maxProduction',
          'High Production Alert',
          `Current production (${production.toFixed(2)} kW) exceeds the maximum threshold (${(maxProductionThreshold / 1000).toFixed(2)} kW)`
        );

        // Check consumption limit
        if (consumptionAlertEnabled) {
          checkThresholdViolation(
            consumption,
            maxConsumptionLimit / 1000, // Convert to kW
            true, // Above threshold
            setAboveMaxConsumption,
            'maxConsumption',
            'High Consumption Alert',
            `Current consumption (${consumption.toFixed(2)} kW) exceeds the maximum limit (${(maxConsumptionLimit / 1000).toFixed(2)} kW)`
          );
        }
      }
    });

    return () => unsubscribe();
  }, [
    houseId, 
    systemEnabled, 
    maintenanceMode, 
    minProductionThreshold, 
    maxProductionThreshold, 
    maxConsumptionLimit, 
    consumptionAlertEnabled,
    lastAlertTime
  ]);

  // Render current status alerts
  const renderStatusAlerts = () => {
    if (!systemEnabled) return null;

    return (
      <div className="space-y-2 mb-4">
        {belowMinProduction && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Low Production Alert</AlertTitle>
            <AlertDescription>
              Current production ({currentProduction.toFixed(2)} kW) is below the minimum threshold ({(minProductionThreshold / 1000).toFixed(2)} kW)
            </AlertDescription>
          </Alert>
        )}

        {aboveMaxProduction && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>High Production Alert</AlertTitle>
            <AlertDescription>
              Current production ({currentProduction.toFixed(2)} kW) exceeds the maximum threshold ({(maxProductionThreshold / 1000).toFixed(2)} kW)
            </AlertDescription>
          </Alert>
        )}

        {aboveMaxConsumption && consumptionAlertEnabled && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>High Consumption Alert</AlertTitle>
            <AlertDescription>
              Current consumption ({currentConsumption.toFixed(2)} kW) exceeds the maximum limit ({(maxConsumptionLimit / 1000).toFixed(2)} kW)
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>System Controls</CardTitle>
            <CardDescription>Manage and control your solar energy system</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {(belowMinProduction || aboveMaxProduction || aboveMaxConsumption) && systemEnabled && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
                <span>Alerts</span>
              </Badge>
            )}
            <Button 
              variant={systemEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleSystem}
              className="flex items-center gap-2"
            >
              <Power className="h-4 w-4" />
              {systemEnabled ? "System On" : "System Off"}
            </Button>
          </div>
        </div>

        {renderStatusAlerts()}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="thresholds">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="thresholds">Production</TabsTrigger>
            <TabsTrigger value="consumption">Consumption</TabsTrigger>
            <TabsTrigger value="battery">Battery</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="thresholds" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="min-threshold">Minimum Production Threshold (W)</Label>
                  <span className="text-sm font-medium">{minProductionThreshold}W</span>
                </div>
                <Slider 
                  id="min-threshold"
                  min={0} 
                  max={200} 
                  step={5}
                  value={[minProductionThreshold]}
                  onValueChange={(value) => updateSetting('production', setMinProductionThreshold, value[0])}
                  disabled={!systemEnabled}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Alert when production falls below this threshold during daylight hours
                </p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="max-threshold">Maximum Production Threshold (W)</Label>
                  <span className="text-sm font-medium">{maxProductionThreshold}W</span>
                </div>
                <Slider 
                  id="max-threshold"
                  min={100} 
                  max={500} 
                  step={10}
                  value={[maxProductionThreshold]}
                  onValueChange={(value) => updateSetting('production', setMaxProductionThreshold, value[0])}
                  disabled={!systemEnabled}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Alert when production exceeds this threshold (potential system overload)
                </p>
              </div>
            </div>

            <Button 
              className={`w-full mt-4 ${changedSettings.production ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              onClick={() => saveControlSettings("Production")}
              disabled={!systemEnabled}
            >
              <Save className="mr-2 h-4 w-4" />
              {changedSettings.production ? 'Save Changes*' : 'Save Production Settings'}
            </Button>
          </TabsContent>

          <TabsContent value="consumption" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="max-consumption">Maximum Consumption Limit (W)</Label>
                  <span className="text-sm font-medium">{maxConsumptionLimit}W</span>
                </div>
                <Slider 
                  id="max-consumption"
                  min={100} 
                  max={500} 
                  step={10}
                  value={[maxConsumptionLimit]}
                  onValueChange={(value) => updateSetting('consumption', setMaxConsumptionLimit, value[0])}
                  disabled={!systemEnabled}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Set maximum power consumption threshold
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  id="consumption-alerts" 
                  checked={consumptionAlertEnabled}
                  onCheckedChange={(checked) => updateSetting('consumption', setConsumptionAlertEnabled, checked)}
                  disabled={!systemEnabled}
                />
                <Label htmlFor="consumption-alerts">Enable consumption alerts</Label>
              </div>

              <div className="bg-yellow-50 p-3 rounded-md flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">Consumption Management</p>
                  <p className="text-sm text-yellow-700">
                    When consumption exceeds the limit, the system will send alerts and can automatically reduce non-essential power usage.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              className={`w-full mt-4 ${changedSettings.consumption ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              onClick={() => saveControlSettings("Consumption")}
              disabled={!systemEnabled}
            >
              <Save className="mr-2 h-4 w-4" />
              {changedSettings.consumption ? 'Save Changes*' : 'Save Consumption Settings'}
            </Button>
          </TabsContent>

          <TabsContent value="battery" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="battery-storage" 
                  checked={batteryStorageEnabled}
                  onCheckedChange={(checked) => updateSetting('battery', setBatteryStorageEnabled, checked)}
                  disabled={!systemEnabled}
                />
                <Label htmlFor="battery-storage">Enable battery storage simulation</Label>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="battery-capacity">Battery Capacity (%)</Label>
                  <span className="text-sm font-medium">{batteryCapacity}%</span>
                </div>
                <Slider 
                  id="battery-capacity"
                  min={0} 
                  max={100} 
                  step={5}
                  value={[batteryCapacity]}
                  onValueChange={(value) => updateSetting('battery', setBatteryCapacity, value[0])}
                  disabled={!systemEnabled || !batteryStorageEnabled}
                />
                <div className="h-2 w-full bg-gray-200 rounded-full mt-2">
                  <div 
                    className={`h-2 rounded-full ${
                      batteryCapacity > 70 ? 'bg-green-500' : 
                      batteryCapacity > 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${batteryCapacity}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-md flex items-start space-x-2">
                <BatteryCharging className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">Battery Simulation</p>
                  <p className="text-sm text-blue-700">
                    This simulates a battery storage system that stores excess energy during high production periods and provides power during low production.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              className={`w-full mt-4 ${changedSettings.battery ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              onClick={() => saveControlSettings("Battery")}
              disabled={!systemEnabled}
            >
              <Save className="mr-2 h-4 w-4" />
              {changedSettings.battery ? 'Save Changes*' : 'Save Battery Settings'}
            </Button>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="maintenance-mode" 
                  checked={maintenanceMode}
                  onCheckedChange={(checked) => updateSetting('maintenance', setMaintenanceMode, checked)}
                />
                <Label htmlFor="maintenance-mode">Enable maintenance mode</Label>
              </div>

              <div>
                <Label htmlFor="scheduled-maintenance" className="mb-2 block">Schedule Maintenance</Label>
                <Input 
                  id="scheduled-maintenance" 
                  type="date" 
                  value={scheduledMaintenance}
                  onChange={(e) => updateSetting('maintenance', setScheduledMaintenance, e.target.value)}
                  disabled={!systemEnabled}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Set a date for scheduled system maintenance
                </p>
              </div>

              <div className="bg-gray-100 p-3 rounded-md flex items-start space-x-2">
                <Settings className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-800 font-medium">Maintenance Information</p>
                  <p className="text-sm text-gray-700">
                    When maintenance mode is enabled, the system will continue to monitor but will not trigger alerts or automated actions.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              className={`w-full mt-4 ${changedSettings.maintenance ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              onClick={() => saveControlSettings("Maintenance")}
              disabled={!systemEnabled}
            >
              <Save className="mr-2 h-4 w-4" />
              {changedSettings.maintenance ? 'Save Changes*' : 'Save Maintenance Settings'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex items-center space-x-2 text-sm text-gray-500 w-full">
          <Zap className="h-4 w-4" />
          <span>
            {systemEnabled 
              ? "System is actively monitoring and controlling your solar energy setup" 
              : "System is currently disabled - no monitoring or control actions will be taken"}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default SystemControls;
