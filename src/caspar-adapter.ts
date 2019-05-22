"use strict";

import {CasparCG, Command} from "../libs/casparcg-connection/dist";
import {Server} from "../libs/node-osc/lib";
import { NOTIFICATIONS, STATES, VIDEO_FORMATS } from "./hyperdeck-server/constants";
import hyperdeck, { THyperdeckContext } from "./hyperdeck-server/server";
import { IServerAdapter, TClip } from "./hyperdeck-server/types";

class CasparAdapter implements IServerAdapter {
    public clips: TClip[] = [];
    public channel: number = 1;
    public layer: number = 10;
    public standard: VIDEO_FORMATS = VIDEO_FORMATS._720p50;
    public positionSeconds: number = 0;
    public frameRate: number = 50;
    public currentClip: TClip = null;
    public state: STATES = STATES.STOPPED;
    public foreground: boolean = true;
    private speed: number = 0;
    private loop: boolean = false;
    private enableLoad: boolean = true;

    private caspar: CasparCG = null;

    constructor(caspar: CasparCG, channel: number, layer: number, enableLoad: boolean, foreground: boolean) {
        this.caspar = caspar;
        this.channel = channel;
        this.layer = layer;
        this.enableLoad = enableLoad;
        this.foreground = foreground;
    }

    public getState(): STATES {
        return this.state;
    }
    public getCurrentClip(): TClip {
        return this.currentClip;
    }
    public getCurrentPosition(): number {
        return this.positionSeconds;
    }
    public getSpeed(): number {
        return this.speed;
    }
    public setSpeed(value: number): boolean {
        this.speed = value;
        return true;
    }
    public getLooping(): boolean {
        return this.loop;
    }
    public setLooping(value: boolean): boolean {
        this.loop = value;
        return true;
    }
    public play(): boolean {
        this.caspar.play(this.channel, this.layer).then((cmd) => {
            this.state = STATES.PLAY;
        }, (err) => console.error(err));

        return true;
    }
    public stop(): boolean {
        this.caspar.stop(this.channel, this.layer)
          .then((cmd) => {
            this.state = STATES.STOPPED;
            this.positionSeconds = 0;
          }, (err) => console.error(err));

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

    private loadClip(clip: TClip): void {
        if (this.enableLoad) {
            if (this.foreground) {
                this.caspar.load(this.channel, this.layer, clip.name, false) // loop always false
                    .then((cmd) => {
                        this.currentClip = clip;
                    }, (err) => console.error(err));
            } else {
                this.caspar.loadbg(this.channel, this.layer, clip.name, false) // loop always false
                    .then((cmd) => {
                        this.currentClip = clip;
                    }, (err) => console.error(err));
            }
        } else {
            console.info("LOAD command disbaled by configugration.");
        }
    }
}

export class TClipServer {
    private caspar: CasparCG;
    private oscServer: Server;
    private adapter: CasparAdapter;
    private hyperdeck: THyperdeckContext;
    private localHyperdeckPort: number;
    private localHost: string;

    constructor(casparPort: number, casparHost: string, localHost: string = "0.0.0.0", localHyperdeckPort: number, oscLocalPort: number, channel: number, layer: number, enableLoad: boolean, foreground: boolean) {
        this.localHost = localHost;
        this.localHyperdeckPort = localHyperdeckPort;

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

        this.adapter = new CasparAdapter(this.caspar, channel, layer, enableLoad, foreground);
        this.hyperdeck = hyperdeck.create(this.adapter);
    }

    public start(): void {
        this.caspar.connect();
        this.queryClips();

        setInterval(() => this.queryClips(), 30 * 1000);

        this.hyperdeck.start(this.localHyperdeckPort, this.localHost);
    }

    private handlerOscMessage(message) {
        if (!message || !message.length || message.length < 2) {
            return;
        }

        const address = message[0];
        const value = message[1];

        const channelPrefix = "/channel/" + this.adapter.channel;
        const stagePrefix = channelPrefix + "/stage/layer/" + this.adapter.layer;
        // Video is moved to foreground, whan playing!
        // const foreBackGroundPrefix = stagePrefix + (this.adapter.foreground ? "/foreground" : "/background");
        const foreBackGroundPrefix = stagePrefix + "/foreground";

        switch (address) {
            case channelPrefix + "/framerate": this.adapter.frameRate = value; break;
            case foreBackGroundPrefix + "/file/time": {
                if (Math.floor(this.adapter.positionSeconds) !== Math.floor(value)) {
                    this.adapter.positionSeconds = value;
                    this.hyperdeck.notify(NOTIFICATIONS.TRANSPORT);
                }
                break;
            }
            case foreBackGroundPrefix + "/file/name": {
                try {
                    const clean = value.substring(0, value.lastIndexOf("."));
                    for (const clip of this.adapter.clips) {
                        if (clip.name === clean && (!this.adapter.currentClip || this.adapter.currentClip.id !== clip.id)) {
                            this.adapter.currentClip = clip;
                            this.hyperdeck.notify(NOTIFICATIONS.TRANSPORT);
                        }
                    }
                } catch (e) {
                    // nop
                }
                break;
            }
            case foreBackGroundPrefix + "/file/0/fps": {
                // todo: adapter.clipFrameRate = value;
                break;
            }
            case foreBackGroundPrefix + "/producer": {
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

    private queryClips(): void {
        this.caspar.cls().then((cmd) => this.handlerClsResponse(cmd), (err) => this.handlerErrors(err));
    }

    private handlerClsResponse(cmd: Command.IAMCPCommand) {
        if (cmd && cmd.response && cmd.response.data) {

          // Clear existing
          const newClips: TClip[] = [];

          const length = cmd.response.data.length;
          let id = 1;
          for (const item of cmd.response.data) {
            if (item.type === "video") {
                const obj = new TClip(id++, item.name, item.frames, item.frameRate);
                newClips.push(obj);
            }
          }

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
        }
    }

    private handlerErrors(reason: any) {
        console.error(reason);
    }
}
