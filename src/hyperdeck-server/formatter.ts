"use strict";

function padNumber(n: number, count: number): string {
    if (n > Math.pow(10, count)) {
        return "" + (Math.pow(10, count) - 1);
    }

    const n2 = ("0000000000" + n);
    const n3 = n2.slice(-count);
    return n3;
}

/**
 * @param {number} frames Current position in frames.
 * @param {number} rate Frame rate,
 */
export function formatTime(frames: number, rate: number): string {
    if (rate <= 0 || frames <= 0) {
        return "00:00:00:00";
    }

    let seconds = Math.floor(frames / rate);
    frames = frames - (seconds * rate);

    let minutes = Math.floor(seconds / 60);
    seconds = seconds - (minutes * 60);

    const hours = Math.floor(minutes / 60);
    minutes = minutes - (hours * 60);

    const result = padNumber(hours, 2)
                    + ":" + padNumber(minutes, 2)
                    + ":" + padNumber(seconds, 2)
                    + ":" + padNumber(frames, 2);
    return result;
}
