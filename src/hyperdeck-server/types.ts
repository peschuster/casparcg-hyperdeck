"use strict";

import * as util from "util";
import {STATES, VIDEO_FORMATS} from "./constants";

const CRLF = "\r\n";

import * as formatter from "./formatter";

export interface IKeyValue {
    key: string;
    value: string;
}

export interface IHash<T> {
    [key: string]: T;
}

export interface INotififcationConfig {
    transport: boolean;
    remote: boolean;
    slot: boolean;
    configuration: boolean;
}

export interface IServerAdapter {
    clips: TClip[];
    standard: VIDEO_FORMATS;
    frameRate: number;

    getState(): STATES;
    getCurrentClip(): TClip;
    getCurrentPosition(): number;

    getSpeed(): number;
    setSpeed(value: number): boolean;
    getLooping(): boolean;
    setLooping(value: boolean): boolean;

    play(): boolean;
    stop(): boolean;
    previousClip(count: number): boolean;
    nextClip(count: number): boolean;
    setClip(clipId: number): boolean;
}

export class TClip {
    public id: number;
    public name: string;
    public frameCount: number;
    public frameRate: number;

    constructor(id: number, name: string, frameCount: number, frameRate: number) {
        this.id = id;
        this.name = name;
        this.frameCount = frameCount;
        this.frameRate = frameRate;
    }

    /**
     * @returns {String}
     */
    public getName(): string {
        return this.name
            + " " + formatter.formatTime(0, this.frameRate)
            + " " + formatter.formatTime(this.frameCount, this.frameRate);
    }
}

export class TResponse {
    public code: number;
    public name: string;
    public params: IHash<string>;

    constructor(code: number, name: string, params: IHash<string> = null) {
        this.code = code;
        this.name = name;
        this.params = params;
    }

    public build(): string {
        let data = util.format("%d %s", this.code, this.name);

        if (this.params) {
            data += ":" + CRLF;
            for (const key in this.params) {
                if (this.params.hasOwnProperty(key)) {
                    data += util.format("%s: %s", key, this.params[key]) + CRLF;
                }
            }
        }

        data += CRLF;

        return data;
    }
}

export class TCmd {
    public name: string;
    public list: IKeyValue[];
    public dict: IHash<string>;

    constructor(name: string, list: IKeyValue[], dict: IHash<string>) {
        this.name = name;
        this.list = list;
        this.dict = dict;
    }
}
