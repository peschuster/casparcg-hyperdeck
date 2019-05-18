"use strict";

import * as fs from "fs";
import {TTemplateServer} from "./template-adapter";

const CONFIG_FILE_NAME = "templateserver.json";

const LOCAL_HOST = "0.0.0.0";
const LOCAL_PORT = 9993;

const CASPAR_HOST = "localhost";
const CASPAR_PORT = 5250;

const config = {
    localHost: LOCAL_HOST,
    localHyperdeckPort: LOCAL_PORT,
    casparHost: CASPAR_HOST,
    casparPort: CASPAR_PORT,
    oscLocalPort: 6250,
    casparChannel: 1,
    casparLayer: 20,
    casparFlashLayer: 1,
    csvPath: "",
};

console.log("======================================");
console.log("#  Hyperdeck Interface for CasparCG  #");
console.log("#  Template Server Application       #");
console.log("======================================");
console.log("       (c) 05/2019 peschuster.de");
console.log("");

if (!fs.existsSync(CONFIG_FILE_NAME)) {
    console.warn("Config file not found: " + CONFIG_FILE_NAME);
    console.info("Using default config values.");
} else {
    try {
        const configObj = JSON.parse(fs.readFileSync(CONFIG_FILE_NAME, "utf8"));

        if (configObj.localHost !== undefined) {
            config.localHost = configObj.localHost;
        }
        if (configObj.localHyperdeckPort !== undefined) {
            config.localHyperdeckPort = configObj.localHyperdeckPort;
        }
        if (configObj.casparHost !== undefined) {
            config.casparHost = configObj.casparHost;
        }
        if (configObj.casparPort !== undefined) {
            config.casparPort = configObj.casparPort;
        }
        if (configObj.oscLocalPort !== undefined) {
            config.oscLocalPort = configObj.oscLocalPort;
        }
        if (configObj.casparChannel !== undefined) {
            config.casparChannel = configObj.casparChannel;
        }
        if (configObj.casparLayer !== undefined) {
            config.casparLayer = configObj.casparLayer;
        }
        if (configObj.casparFlashLayer !== undefined) {
            config.casparFlashLayer = configObj.casparFlashLayer;
        }
        if (configObj.csvPath !== undefined) {
            config.csvPath = configObj.csvPath;
        }

    } catch (e) {
        console.warn("Error reading config file:");
        console.warn(e);
    }
}

const clipServer = new TTemplateServer(
    config.casparPort,
    config.casparHost,
    config.localHost,
    config.localHyperdeckPort,
    config.oscLocalPort,
    config.csvPath,
    config.casparChannel,
    config.casparLayer,
    config.casparFlashLayer);

clipServer.start();
console.info("Template Server started...");
