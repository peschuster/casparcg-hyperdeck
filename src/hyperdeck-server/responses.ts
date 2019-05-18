"use strict";

import {TResponse} from "./types";

export default {
    SYNTAX_ERROR: new TResponse(100, "syntax error"),
    UNSUPPORTED_PARAMETER: new TResponse(101, "unsupported parameter"),
    INVALID_VALUE: new TResponse(102, "invalid value"),
    UNSUPPORTED: new TResponse(103, "unsupported"),
    DISK_FULL: new TResponse(104, "disk full"),
    NO_DISK: new TResponse(105, "no disk"),
    DISK_ERROR: new TResponse(106, "disk error"),
    TIMELINE_EMPTY: new TResponse(107, "timeline empty"),
    INTERNAL_ERROR: new TResponse(108, "internal error"),
    OUT_OF_RANGE: new TResponse(109, "out of range"),
    NO_INPUT: new TResponse(110, "no input"),
    REMOTE_CONTROL_DISABLED: new TResponse(111, "remote control disabled"),
    CONNECTION_REJECTED: new TResponse(120, "connection rejected"),
    INVALID_STATE: new TResponse(150, "invalid state"),
    OK: new TResponse(200, "ok"),
    DECK_REBOOTING: new TResponse(213, "deck rebooting"),
};
