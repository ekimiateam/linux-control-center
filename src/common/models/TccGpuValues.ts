export interface IiGpuInfo {
    temp: number;
    coreFrequency: number;
    maxCoreFrequency: number;
    powerDraw: number;
    vendor: string;
}

export interface IdGpuInfo {
    coreFrequency: number;
    maxCoreFrequency: number;
    powerDraw: number;
    maxPowerLimit: number;
    enforcedPowerLimit: number;
    d0MetricsUsage?: boolean;
}

export interface IDeviceCounts {
    intelIGpuDevices: number;
    amdIGpuDevices: number;
    amdDGpuDevices: number;
    nvidiaDevices: number;
}
