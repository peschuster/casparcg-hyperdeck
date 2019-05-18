import {STATES, VIDEO_FORMATS} from "./constants";
import server from "./server";
import {IServerAdapter, TClip, TCmd, TResponse} from "./types";

const PORT = 9993;
const HOST = "0.0.0.0";

class TServerState implements IServerAdapter {
    public clips: TClip[] = [];
    public state: STATES = STATES.STOPPED;
    public standard: VIDEO_FORMATS = VIDEO_FORMATS._720p50;
    public frameRate: number = 50;
    public currentClip: TClip = null;
    public positionSeconds: number = 0;
    public loop: boolean = false;
    public speed: number = 0;

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
        throw new Error("Method not implemented.");
    }
    public stop(): boolean {
        throw new Error("Method not implemented.");
    }
    public nextClip(count: number) {
        if (!this.clips || this.clips.length === 0) {
            return false;
        }

        if (this.currentClip == null && this.clips.length >= count) {
            this.currentClip = this.clips[count - 1];
            return true;
        }

        let index = this.clips.indexOf(this.currentClip) + count;
        while (index >= this.clips.length) {
            index -= this.clips.length;
        }

        this.currentClip = this.clips[index];
        return true;
    }

    public previousClip(count: number) {
        if (!this.clips || this.clips.length === 0) {
            return false;
        }

        if (this.currentClip == null && this.clips.length > count) {
            this.currentClip = this.clips[this.clips.length - count - 1];
            return true;
        }

        let index = this.clips.indexOf(this.currentClip) - count;
        while (index < 0) {
            index += this.clips.length;
        }

        this.currentClip = this.clips[index];
        return true;
    }

    public setClip(id: number) {
        const clips = this.clips.filter((c) => c.id === id);
        if (clips != null && clips.length === 1) {
            this.currentClip = clips[0];
            return true;
        }

        return false;
    }
}

const adapter = new TServerState();

const context = server.create(adapter);
context.start(PORT, HOST);
