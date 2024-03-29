/*!
 * Copyright (c) 2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { Component, OnInit } from "@angular/core";
import { ConfigService } from "../config.service";
import { UtilsService } from "../utils.service";
import { TccDBusClientService } from "../tcc-dbus-client.service";
import { Subscription } from "rxjs";
import { first } from "rxjs/operators";

@Component({
    selector: "app-prime-select",
    templateUrl: "./prime-select.component.html",
    styleUrls: ["./prime-select.component.scss"],
})
export class PrimeSelectComponent implements OnInit {
    public primeState: string;
    public activeState: string;
    public primeSelectValues: string[] = ["iGPU", "dGPU", "on-demand"];
    private subscriptions: Subscription = new Subscription();

    constructor(
        private utils: UtilsService,
        private config: ConfigService,
        private tccdbus: TccDBusClientService
    ) {}

    public async ngOnInit() {
        this.subscribePrimeState();
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    private subscribePrimeState() {
        this.tccdbus.primeState.pipe(first()).subscribe((state: string) => {
            if (state) {
                this.primeState = this.activeState = state;
            }
        });
    }

    public async applyGpuProfile(selectedPrimeStatus: string): Promise<void> {
        const status = await this.askProceedDialog();

        if (status === "CANCEL" || status === undefined) {
            this.activeState = this.primeState;
            return;
        }

        const config = {
            title: $localize`:@@primeSelectDialogApplyProfileTitle:Applying Graphics Profile`,
            description: $localize`:@@primeSelectDialogApplyProfileDescription:Do not power off your device until the process is complete.`,
        };

        const pkexecSetPrimeSelectAsync =
            this.config.pkexecSetPrimeSelectAsync(selectedPrimeStatus);

        const isSuccessful = await this.utils.waitingDialog(
            config,
            pkexecSetPrimeSelectAsync
        );

        if (isSuccessful) {
            this.activeState = this.primeState = selectedPrimeStatus;
            if (status === "REBOOT") {
                this.utils.execCmdAsync("reboot");
            }
        } else {
            this.activeState = this.primeState;
        }
    }

    private async askProceedDialog(): Promise<string> {
        const rebootConfig = {
            title: $localize`:@@primeSelectAskProceedTitle:Warning`,
            description: $localize`:@@primeSelectAskProceedDescription:For the change to take effect, your computer must be restarted. If the computer is shut down immediately, unsaved files or changes will be lost. In this case, select 'Reboot later' and shut down your computer at a later time.`,
            labelData: [
                {
                    label: $localize`:@@dialogAbort:Cancel`,
                    value: "CANCEL",
                },
                {
                    label: $localize`:@@dialogInstantReboot:Instant Reboot`,
                    value: "REBOOT",
                },
                {
                    label: $localize`:@@dialogRebootLater:Reboot later`,
                    value: "NO_REBOOT",
                },
            ],
        };
        const returnValue = await this.utils.choiceDialog(rebootConfig);
        return returnValue.value as string;
    }
}
