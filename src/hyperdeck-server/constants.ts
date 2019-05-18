"use strict";

export enum STATES {
    PREVIEW = "preview",
    STOPPED = "stopped",
    PLAY = "play",
    FORWARD = "forward",
    REWIND = "rewind",
    JOG = "jog",
    SHUTTLE = "shuttle",
    RECORD = "record",
}

export enum VIDEO_FORMATS {
    _NTSC = "NTSC",
    _PAL = "PAL",
    _NTSCp = "NTSCp",
    _PALp = "PALp",
    _720p50 = "720p50",
    _720p5994 = "720p5994",
    _720p60 = "720p60",
    _1080p23976 = "1080p23976",
    _1080p24 = "1080p24",
    _1080p25 = "1080p25",
    _1080p2997 = "1080p2997",
    _1080p30 = "1080p30",
    _1080i50 = "1080i50",
    _1080i5994 = "1080i5994",
    _1080i60 = "1080i60",
    _4Kp23976 = "4Kp23976",
    _4Kp24 = "4Kp24",
    _4Kp25 = "4Kp25",
    _4Kp2997 = "4Kp2997",
    _4Kp30 = "4Kp30",
    _4Kp50 = "4Kp50",
    _4Kp5994 = "4Kp5994",
    _4Kp60 = "4Kp60",
}

export enum FILE_FORMATS {
    QuickTimeUncompressed = "QuickTimeUncompressed",
    QuickTimeProResHQ = "QuickTimeProResHQ",
    QuickTimeProRes = "QuickTimeProRes",
    QuickTimeProResLT = "QuickTimeProResLT",
    QuickTimeProResProxy = "QuickTimeProResProxy",
    QuickTimeDNxHR220 = "QuickTimeDNxHR220",
    DNxHR220 = "DNxHR220",
}

export enum AUDIO_INPUTS {
    embedded = "embedded",
    XLR = "XLR",
    RCA = "RCA",
}

export enum VIDEO_INPUTS {
    SDI = "SDI",
    HDMI = "HDMI",
    component = "component",
}

export enum NOTIFICATIONS {
    TRANSPORT = "transport",
    REMOTE = "remote",
    SLOT = "slot",
    CONFIGURATION = "configuration",
}
