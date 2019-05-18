"use strict";

import * as csvParser from "csv-parse";
import * as fs from "fs";

import {CasparCG, Command} from "../libs/casparcg-connection/dist";
import {Server} from "../libs/node-osc/lib";
import { STATES, VIDEO_FORMATS } from "./hyperdeck-server/constants";
import hyperdeck, { THyperdeckContext } from "./hyperdeck-server/server";
import { IServerAdapter, TClip } from "./hyperdeck-server/types";

const TEMPLATE_LENGTH = 10 * 60;
const TEMPLATE_FRAME_RATE = 50;

class TTemplate extends TClip {
    public template: string;
    public params: string[];

    constructor(id: number, template: string, params: string[]) {
        super(
            id,
            params ? params[0] : "",
            TEMPLATE_LENGTH * TEMPLATE_FRAME_RATE,
            TEMPLATE_FRAME_RATE);

        this.template = template;
        this.params = params;
    }

    public getParamString(): string {
        let data = "<templateData>";

        let paramIndex = 0;
        if (this.params) {
            for (const param of this.params) {
                data += "<componentData id=\"f" + paramIndex.toString() + "\">"
                    + "<data id=\"text\" value=\"" + param.replace("\"", "&quot;") + "\"/></componentData>";
                paramIndex += 1;
            }
        }

        data += "</templateData>";
        return data;
    }
}

class TemplateAdapter implements IServerAdapter {
    public clips: TTemplate[] = [];
    public channel: number = 1;
    public layer: number = 20;
    public flashLayer: number = 1;
    public standard: VIDEO_FORMATS = VIDEO_FORMATS._720p50;
    public positionSeconds: number = 0;
    public frameRate: number = 50;
    public currentClip: TTemplate = null;
    public state: STATES = STATES.STOPPED;
    private speed: number = 1;
    private loop: boolean = false;

    private caspar: CasparCG = null;

    constructor(caspar: CasparCG, channel: number, layer: number, flashLayer: number) {
        this.caspar = caspar;
        this.channel = channel;
        this.layer = layer;
        this.flashLayer = flashLayer;
    }

    public getState(): STATES {
        return this.state;
    }
    public getCurrentClip(): TTemplate {
        return this.currentClip;
    }
    public getCurrentPosition(): number {
        return this.positionSeconds;
    }
    public getSpeed(): number {
        return this.speed;
    }
    public setSpeed(value: number): boolean {
        return false;
    }
    public getLooping(): boolean {
        return this.loop;
    }
    public setLooping(value: boolean): boolean {
        return false;
    }
    public play(): boolean {
        if (this.currentClip != null) {
            this.caspar.cgAdd(this.channel, this.layer, this.flashLayer, this.currentClip.template, true, this.currentClip.getParamString())
                .then((cmd) => {
                    this.state = STATES.PLAY;
                }, (err) => console.error(err));
        } else {
            this.caspar.cgPlay(this.channel, this.layer, this.flashLayer)
                .then((cmd) => {
                    this.state = STATES.PLAY;
                }, (err) => console.error(err));
        }

        return true;
    }
    public stop(): boolean {

        this.caspar.cgStop(this.channel, this.layer, this.flashLayer)
          .then((cmd) => {
            this.state = STATES.STOPPED;
            this.positionSeconds = 0;
            // this.currentClip = null;
          }, (err) => {
              this.state = STATES.STOPPED;
              this.positionSeconds = 0;
              // this.currentClip = null;
          });

        return true;
    }
    public nextClip(count: number) {
        if (!this.clips || this.clips.length === 0) {
            return false;
        }

        if (this.currentClip == null && this.clips.length >= count) {
            this.loadClip(this.clips[count - 1]);
            return true;
        }

        let index = this.clips.indexOf(this.currentClip) + count;
        while (index >= this.clips.length) {
            index -= this.clips.length;
        }

        this.loadClip(this.clips[index]);
        return true;
    }

    public previousClip(count: number) {
        if (!this.clips || this.clips.length === 0) {
            return false;
        }

        if (this.currentClip == null && this.clips.length > count) {
            this.loadClip(this.clips[this.clips.length - count - 1]);
            return true;
        }

        let index = this.clips.indexOf(this.currentClip) - count;
        while (index < 0) {
            index += this.clips.length;
        }

        this.loadClip(this.clips[index]);
        return true;
    }

    public setClip(id: number) {
        const clips = this.clips.filter((c) => c.id === id);
        if (clips != null && clips.length === 1) {
            this.loadClip(clips[0]);
            return true;
        }

        return false;
    }

    private loadClip(clip: TTemplate): void {
        this.currentClip = clip;
        // this.caspar.cgAdd(this.channel, this.layer, this.flashLayer, clip.template, false, clip.getParamString())
        //   .then((cmd) => {
        //     this.currentClip = clip;
        //   }, (err) => console.error(err));
    }
}

export class TTemplateServer {
    private caspar: CasparCG;
    private oscServer: Server;
    private adapter: TemplateAdapter;
    private hyperdeck: THyperdeckContext;
    private localHyperdeckPort: number;
    private localHost: string;
    private templateDataFile: string;
    private templateList: string[] = [];

    constructor(casparPort: number, casparHost: string, localHost: string = "0.0.0.0", localHyperdeckPort: number, oscLocalPort: number, templateDataFile: string, channel: number, layer: number, flashLayer: number) {
        this.localHost = localHost;
        this.localHyperdeckPort = localHyperdeckPort;
        this.templateDataFile = templateDataFile;

        this.caspar = new CasparCG({ host: casparHost, port: casparPort, localAddress: localHost });

        this.oscServer = new Server(oscLocalPort, localHost);
        this.oscServer.on("message", (m) => {
            if (m && m.length) {
                if (m[0] === "#bundle") {
                    for (let i = 2; i < m.length; i++) {
                        this.handlerOscMessage(m[i]);
                    }
                } else {
                    this.handlerOscMessage(m);
                }
            }
        });

        this.adapter = new TemplateAdapter(this.caspar, channel, layer, flashLayer);
        this.hyperdeck = hyperdeck.create(this.adapter);
    }

    public start(): void {
        this.caspar.connect();
        this.hyperdeck.start(this.localHyperdeckPort, this.localHost);

        this.queryTemplates();
        setInterval(() => this.queryTemplates(), 30 * 1000);

        fs.watchFile(this.templateDataFile, () => this.loadCsv());

        // Wait a few ms for templates to be loaded.
        setTimeout(() => this.loadCsv(), 500);
    }

    private handlerOscMessage(message) {
        if (!message || !message.length || message.length < 2) {
            return;
        }

        const address = message[0];
        const value = message[1];

        const channelPrefix = "/channel/" + this.adapter.channel;
        const stagePrefix = channelPrefix + "/stage/layer/" + this.adapter.layer;

        switch (address) {
            case channelPrefix + "/framerate": this.adapter.frameRate = value; break;
            case stagePrefix + "/foreground/producer": {
                if (value === "empty") {
                    this.adapter.state = STATES.STOPPED;
                    this.adapter.currentClip = null;
                } else if (this.adapter.positionSeconds > 0) {
                    this.adapter.state = STATES.PLAY;
                }
                break;
            }
        }
    }

    private queryTemplates(): void {
        this.caspar.tls().then((cmd) => this.handlerTlsResponse(cmd), (err) => this.handlerErrors(err));
    }

    private handlerTlsResponse(cmd: Command.IAMCPCommand) {
        if (cmd && cmd.response && cmd.response.data) {

          // Clear existing
          this.templateList.splice(0, this.templateList.length);

          const length = cmd.response.data.length;
          for (let i = 0; i < length; i++) {
            const item = cmd.response.data[i];
            if (item.type === "template") {
                this.templateList.push(item.name);
            }
          }
        }
    }

    private loadCsv(): void {
        if (fs.existsSync(this.templateDataFile)) {
            console.log("Reading csv file...");
            const csvData = fs.readFileSync(this.templateDataFile, "utf8");

            csvParser(csvData, { delimiter: ";"}, (err, records, info) => {

                if (!records && !records.length) {
                    return;
                }

                const newClips: TTemplate[] = [];

                let id = 0;
                for (const entry of records) {
                    const length = entry.length;
                    if (length < 1) {
                        continue;
                    }

                    // first one is header row
                    if (id === 0) {
                        id++;
                        continue;
                    }

                    const name = entry[0];

                    // Check that the template is known by CasparCG
                    if (this.templateList.indexOf(name) < 0) {
                        console.warn("Discarding unkonwn template " + name);
                        continue;
                    }

                    const params = [];

                    for (let i = 1; i < length; i++) {
                      const item = entry[i];
                      params.push(item);
                    }

                    const obj = new TTemplate(id++, name, params);
                    newClips.push(obj);
                }

                console.log("Read " + (id - 1) + " entries from CSV.");

                let notify: boolean = false;
                if (this.adapter.clips.length !== newClips.length) {
                    notify = true;
                } else {
                    let index = 0;
                    for (const clip of newClips) {
                        if (clip.name !== this.adapter.clips[index++].name) {
                            notify = true;
                            break;
                        }
                    }
                }

                // Clear existing
                this.adapter.clips.splice(0, this.adapter.clips.length);
                for (const clip of newClips) {
                    this.adapter.clips.push(clip);
                }

                if (notify) {
                    this.hyperdeck.switch();
                }
            });
        } else {
            console.error("CSV file not found: " + this.templateDataFile);
        }
    }

    private handlerErrors(reason: any) {
        console.error(reason);
    }
}
