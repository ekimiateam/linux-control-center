/*!
 * Copyright (c) 2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */
import { DeviceInfo, PumpVoltage, RGBState } from "./LCT21001";

const debugAquarisAPICalls = false;

export interface AquarisState {
    deviceUUID: string,
    red: number,
    green: number,
    blue: number,
    ledMode: RGBState | number,
    fanDutyCycle: number,
    pumpDutyCycle: number,
    pumpVoltage: PumpVoltage | number,
    ledOn: boolean,
    fanOn: boolean,
    pumpOn: boolean
}

export const aquarisAPIHandle = 'aquarisAPIHandle';

export class ClientAPI {

    constructor(private ipc: Electron.IpcRenderer, private apiHandle: string) {}

    public connect(deviceUUID: string) { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.connect.name, deviceUUID]); }
    public disconnect() { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.disconnect.name]); }
    public isConnected() { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.isConnected.name]) as Promise<boolean>; }
    public hasBluetooth() { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.hasBluetooth.name]) as Promise<boolean>; }
    public startDiscover() { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.startDiscover.name]); }
    public stopDiscover() { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.stopDiscover.name]); }
    public getDevices() { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.getDevices.name]) as Promise<DeviceInfo[]>; }
    public getState() { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.getState.name]) as Promise<AquarisState>; }
    public readFwVersion() { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.readFwVersion.name]) as Promise<string>; }
    public updateLED(red: number, green: number, blue: number, state: RGBState | number) { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.updateLED.name, red, green, blue, state]); }
    public writeRGBOff() { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.writeRGBOff.name]); }
    public writeFanMode(dutyCyclePercent: number) { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.writeFanMode.name, dutyCyclePercent]); }
    public writeFanOff() { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.writeFanOff.name]); }
    public writePumpMode(dutyCyclePercent: number, voltage: PumpVoltage | number) { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.writePumpMode.name, dutyCyclePercent, voltage]); }
    public writePumpOff() { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.writePumpOff.name]); }
    public saveState() { return this.ipc.invoke(this.apiHandle, [ClientAPI.prototype.saveState.name]); }
}

export function registerAPI (ipcMain: Electron.IpcMain, apiHandle: string, mainsideHandlers: Map<string, (...args: any[]) => any>) {

    ipcMain.handle(apiHandle, async (event, args: any[]) => {
        const mainsideFunction = mainsideHandlers.get(args[0]);
        if (mainsideFunction === undefined) {
            throw Error(apiHandle + ': Undefined API function');
        } else {
            if (debugAquarisAPICalls && args[0] !== 'isConnected') {
                console.log(`${apiHandle}: ${args[0]}(${args.slice(1)})`);
            }
            try {
                return mainsideFunction.call(this, ...args.slice(1));
            } catch (err) {
                console.log(`Error in [${apiHandle}: ${args[0]}(${args.slice(1)})] => ${err}`);
            }
        }
    });
}

export function unregisterAPI(ipcMain: Electron.IpcMain, apiHandle: string) {
    ipcMain.removeHandler(apiHandle);
}
