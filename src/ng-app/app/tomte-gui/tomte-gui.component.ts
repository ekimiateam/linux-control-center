/*!
 * Copyright (c) 2019-2021 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Component, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { UtilsService } from '../utils.service';
import { ProgramManagementService } from '../program-management.service';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { translate } from '@angular/localize/src/utils';
import { __core_private_testing_placeholder__ } from '@angular/core/testing';

interface ITomteModule {
    moduleName: string,
    version: string,
    installed: boolean,
    blocked: boolean,
    prerequisite: string
}

@Component({
  selector: 'app-tomte-gui',
  templateUrl: './tomte-gui.component.html',
  styleUrls: ['./tomte-gui.component.scss'],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { displayDefaultIndicatorType: false }
    }
  ]
})
export class TomteGuiComponent implements OnInit {
    tomteIsInstalled = false;
    jsonError = false;
    rebootRequired = false;
    tomteListArray: ITomteModule[] = [];
    moduleToolTips = new Map();
    columnsToDisplay = ['moduleName', 'moduleVersion', 'moduleInstalled', 'moduleBlocked', 'moduleDescription'];
    // TODO maybe there is a better way to handle this too :)
    tomteMode = "";
    tomteModes =["AUTOMATIC", "UPDATES_ONLY", "DONT_CONFIGURE"];
    // those are basically just flags that are checked by certain gui components to figure out if they should be shown or not.
    showRetryButton = false;
    loadingInformation = false;
    // TODO when installing tomte on a non tuxedo device grab the error message in the tomte-list function and
    // set this variable to false to output the correct error message in the control center
    isTuxedoDevice = true;
    constructor(
        private electron: ElectronService,
        private utils: UtilsService,
        private pmgs: ProgramManagementService
    ) { }




    ngOnInit() {
    }

    ngAfterViewInit() {
        this.tomtelist();
    }

    public focusControl(control): void {
        setImmediate(() => { control.focus(); });
    }

    public openExternalUrl(url: string): void {
        this.electron.shell.openExternal(url);
    }


    private async tomtelist()
    {
        // check for tomte version and then either use oldTomteList or tomteListJSON
        // only check version once and then store it?
        this.showRetryButton = false;
        this.loadingInformation = true;
        this.tomteIsInstalled = await this.pmgs.isInstalled("tuxedo-tomte");
        if (this.tomteIsInstalled)
            {
                await this.tomteListJson();
            }
            this.loadingInformation = false;
    }

    private async tomteListJson()
    {
        // retries to list the information a couple of times, this is only triggered if tomte is already running.
        for (let i = 0; i < 30; i++)
        {
            let command = "tuxedo-tomte listjson"
            let results
            try
            {
                results = await this.utils.execCmdAsync(command + "");
                results = results.replace(/^[^\{]*\{/, "{"); // delete everything up to the first occurance of {
                this.parseTomteListJson(results);
                this.getModuleDescriptions();
                break;
            }
            catch (e)
            {
                if(i === 10)
                {
                    this.throwErrorMessage($localize `:@@tomteGuiTomteListErrorPopup:Information from command 'tomte list' could not be obtained. Is tomte already running?`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
                if(i === 29)
                {
                    this.showRetryButton = true;
                }
                continue;
            }
        }
    }

    private parseTomteListJson(rawTomteListOutput: string | undefined)
    {
        if (!rawTomteListOutput)
        {
            return;
        }
        try
        {
            let givenobject = JSON.parse(rawTomteListOutput);
            this.jsonError = false;

        // now let's get the mode, modules etc out of it
        this.tomteMode = givenobject.mode;
        this.tomteListArray = [];
        this.rebootRequired = givenobject.restart === "yes";
        for (let i = 0; i < givenobject.modules.length; i++)
        {
            let module = givenobject.modules[i];
            this.tomteListArray.push({moduleName: module.name, version: module.version, installed: module.installed === "yes", blocked: module.blocked === "yes", prerequisite: module.required});
        }
        }
        catch (e)
        {
            console.error("not valid json");
            this.jsonError = true;
        }

    }

    /*
        Loads the descriptions for each module in the background and puts it into moduleToolTips Variable that is then
        read in the HTML file
    */
    private async getModuleDescriptions()
    {
        if (this.moduleToolTips.size < this.tomteListArray.length)
        {
        for (let i = 0; i < this.tomteListArray.length; i++)
            {
                let modulename = this.tomteListArray[i].moduleName;
                if(this.moduleToolTips.has(modulename))
                {
                    continue;
                }
                let command = "LANGUAGE=" + this.utils.getCurrentLanguageId() + " tuxedo-tomte description " + modulename;
                try
                {
                    let results = await this.utils.execCmdAsync(command);
                    this.moduleToolTips.set(modulename, results);
                }
                catch (err)
                {
                }

            }
        }
    }

    /*
========================================================================
===================       UTILITY FUNCTIONS          ===================
========================================================================
*/

/*
        Returns properly translated tooltip for the sliders in each of their proper conditions
*/

    public getSliderToolTip(whichButton, prerequisite, blocked, installed)
    {
        if (whichButton === 'blocked')
        {
            if (prerequisite === 'prerequisite')
            {
                return $localize `:@@tomteGuiSliderToolTipBlockRequisite:Cannot block a module that is a prerequisite`
            }
            if(blocked)
            {
                return $localize `:@@tomteGuiSliderToolTipUnblock:Unblock this module`
            }
            else
            {
                return $localize `:@@tomteGuiSliderToolTipBlock:Block this module`
            }
        }
        if (whichButton === 'installed')
        {
            if (prerequisite === 'prerequisite')
            {
                return $localize `:@@tomteGuiSliderToolTipUninstallRequisite:Cannot uninstall a module that is a prerequisite`
            }
            if(blocked)
            {
                return $localize `:@@tomteGuiSliderToolTipUnInstallBlocked:Cannot un-/install a module that is blocked.`
            }
            if (installed)
            {
                return $localize `:@@tomteGuiSliderToolTipBlockUninstall:Uninstall this module`
            }
            else
            {
                return $localize `:@@tomteGuiSliderToolTipInstall:Install this module`
            }
        }


    }

    /*
        Opens Dialogue containing given errormessage
        Also logs the error to the browser console
    */
    private async throwErrorMessage(errorMessage: string | undefined)
    {
        console.error(errorMessage);
        const askToClose = await this.utils.confirmDialog({
            title: $localize `:@@tomteGuiDialogErrorTitle:An Error occured!`,
            description: errorMessage,
            linkLabel: ``,
            linkHref: null,
            buttonAbortLabel: ``,
            buttonConfirmLabel: `Ok`,
            checkboxNoBotherLabel: `:`,
            showCheckboxNoBother: false
        });
    }


    /*
        Opens Dialogue asking the user if they are sure to proceed
    */
    private async confirmChangesDialogue()
    {
        const connectNoticeDisable = localStorage.getItem('connectNoticeDisable');
        if (connectNoticeDisable === null || connectNoticeDisable === 'false') {
            const askToClose = await this.utils.confirmDialog({
                title: $localize `:@@tomteBreakingChangesTitle:Are you sure you want to issue this command?`,
                description: $localize `:@@tomteBreakingChangesWarning:Warning: Changes to the default Tomte-configuration can lead to your device not working properly anymore!`,
                linkLabel: '',
                linkHref: '',
                buttonAbortLabel: $localize `:@@tomteAbortButtonLabel:Abort`,
                buttonConfirmLabel: $localize `:@@tomteConfirmButtonLabel:I understand`,
                checkboxNoBotherLabel: $localize `:@@tomteDialogCheckboxNoBotherLabel:Don't ask again`,
                showCheckboxNoBother: true
            });
            if (askToClose.noBother)
            {
                localStorage.setItem('connectNoticeDisable', 'true');
            }
            if (!askToClose.confirm)
            {
                return false;
            }
        }
        return true;
    }


    /*
        Opens Dialogue informing the user that everything they have customly configured will be rewoken by issueing this command
    */
    private async confirmResetDialogue()
    {
        const askToClose = await this.utils.confirmDialog({
            title: $localize `:@@tomteResetDefaultsTitle:Are you sure you want to reset to defaults?`,
            description: $localize `:@@tomteResetDefaultsMessage:This will revert any manual configuration you did, are you sure you want to proceed?`,
            linkLabel: '',
            linkHref: '',
            buttonAbortLabel: $localize `:@@tomteAbortButtonLabel:Abort`,
            buttonConfirmLabel: $localize `:@@tomteConfirmButtonLabel:I understand`,
            checkboxNoBotherLabel: '',
            showCheckboxNoBother: false
        });
        if (askToClose.confirm)
        {
            return true;
        }
        if (!askToClose.confirm)
        {
            return false;
        }
    }

/*
========================================================================
===================     BUTTON CLICK FUNCTIONS       ===================
========================================================================
*/

    /*
        Tries to completely restore tomte to default configuration.
        Throws exhaustive error message if it fails.
    */
    public async tomteResetToDefaults()
    {
        this.utils.pageDisabled = true;
        let dialogueYes = await this.confirmResetDialogue();
        if (!dialogueYes)
        {
            this.tomtelist();
            this.utils.pageDisabled = false;
            return;
        }
        let command1 = "pkexec tuxedo-tomte AUTOMATIC";
        let command2 = "pkexec tuxedo-tomte unblock all";
        let command3 = "pkexec tuxedo-tomte reconfigure all";
        let res1;
        let res2;
        let res3;
        try
        {

            res1 = await this.utils.execFile(command1);
            res2 = await this.utils.execFile(command2);
            res3 = await this.utils.execFile(command3);
            this.tomtelist();
        }
        catch
        {
            console.error("One of the reset commands failed, here is their output: Function 1 Command: "
            + command1 + " Results: " + res1 +
            " Function 2 Command: " + command2 + " Results: " + res2 +
            " Function 3 Command: " + command3 + " Results: " + res3
            );
            this.throwErrorMessage($localize `:@@tomteGuiResetFailedPopup:Reset failed. Maybe Tomte is already running? If that is the case simply try again later.`);
        }
        this.utils.pageDisabled = false;
    }


    /*
        Tries to either install or uninstall a given module, depending on if the module is already installed or not
        Not to be confused with the installTomteButton() function that instead tries to install tomte
    */
    public async tomteUn_InstallButton(name: string, isInstalled: boolean, isBlocked: boolean)
    {
        this.utils.pageDisabled = true;
        let dialogueYes = await this.confirmChangesDialogue();
        if (!dialogueYes)
        {
            this.tomtelist();
            this.utils.pageDisabled = false;
            return;
        }
        if (isBlocked)
        {
            this.utils.pageDisabled = false;
            return;
        }
        if (isInstalled)
        {
            let command = "yes | pkexec tuxedo-tomte remove " + name;

            let results = await this.utils.execCmdAsync(command).catch((err) => {
                console.error(err);
                this.utils.pageDisabled = false;
                this.tomtelist();
                return;
            });
        }
        else
        {

            let command = "pkexec tuxedo-tomte configure " + name;

            let results = await this.utils.execFile(command).catch((err) => {
                console.error(err);
                this.utils.pageDisabled = false;
                this.tomtelist();
                return;
            });
        }
        this.tomtelist();
        this.utils.pageDisabled = false;
    }


    /*
        Tries to either block or unblock a given module, depending on if the module is already blocked or not
    */
    public async tomteBlockButton(name: string, isBlocked: boolean)
    {
        let dialogueYes = await this.confirmChangesDialogue();
        if (!dialogueYes)
        {
            this.tomtelist();
            this.utils.pageDisabled = false;
            return;
        }
        this.utils.pageDisabled = true;
        let command = "pkexec tuxedo-tomte block " + name;
        if (isBlocked)
        {
            command = "pkexec tuxedo-tomte unblock " + name ;
        }
        let results = await this.utils.execFile(command).catch((err) => {
            console.error(err);
            this.utils.pageDisabled = false;
            return;
        });
        this.tomtelist();
        this.utils.pageDisabled = false;
    }


    /*
        Changes the mode tomte is operating in to the mode given and throws an error message if this doesnt work
    */
    public async tomteModeButton(mode)
    {
        console.log(mode);
        let dialogueYes = await this.confirmChangesDialogue();
        if (!dialogueYes)
        {
            this.tomtelist();
            this.utils.pageDisabled = false;
            return;
        }
        this.utils.pageDisabled = true;
        let command = "pkexec tuxedo-tomte " + mode.value ;
        let results = await this.utils.execFile(command).catch((err) => {
            console.error(err);
            this.utils.pageDisabled = false;
            return;
          });
        this.tomtelist();
        this.utils.pageDisabled = false;
    }


    /*
        Tries to install tomte when button is clicked and throws error message if it fails.
        Not to be confused with the tomteUn_InstallButton() function, which tries to un-/install a given module
    */
    public async installTomteButton()
    {
        this.utils.pageDisabled = true;
        let gotInstalled = await this.pmgs.install("tuxedo-tomte");
        if (!gotInstalled)
        {
            this.throwErrorMessage($localize `:@@tomteGuiInstallErrorMessagePopup:Tomte failed to install. Do you use a tuxedo device and are using the tuxedo repos?`);
        }
        this.utils.pageDisabled = false;
        this.tomtelist();
    }


}
