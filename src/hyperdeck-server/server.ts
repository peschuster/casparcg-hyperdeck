"use strict";

import { NOTIFICATIONS } from "./constants";
import * as formatter from "./formatter";
import {IHash, IKeyValue, INotififcationConfig, IServerAdapter, TClip, TCmd, TResponse} from "./types";

import * as net from "net";
import * as util from "util";
import * as responses from "./responses";

const PORT = 9993;

const VERSION = "1.8";
const MODEL = "CasparCG";
const UNIQUE_ID = "1234";

const socketId = (client: net.Socket) => client.remoteAddress + ":" + client.remotePort;

const currentPos = (adapter: IServerAdapter) => formatter.formatTime(adapter.getCurrentPosition() * adapter.frameRate, adapter.frameRate);

function handleConnectionInfo(): TResponse {
  return new TResponse(500, "connection info", { "protocol version": VERSION, "model": MODEL });
}

function handleDeviceInfo(): TResponse {
  return new TResponse(204, "device info", { "protocol version": VERSION, "model": MODEL, "unique id": UNIQUE_ID });
}

function handleTransportInfo(context: THyperdeckContext, client: net.Socket = null, cmd: TCmd = null): TResponse {
  const currentClip = context.adapter.getCurrentClip();
  const data: IHash<string> = {
    "status": context.adapter.getState(),
    "speed": context.adapter.getSpeed().toString(),
    "slot id": context.slotId.toString(),
    "display timecode": currentPos(context.adapter),
    "timecode": currentPos(context.adapter),
    "clip id": currentClip == null ? "0" : currentClip.id.toString(),
    "video format": context.adapter.standard,
    "loop": context.adapter.getLooping() ? "true" : "false",
  };

  return new TResponse(208, "transport info", data);
}

function handleNotify(context: THyperdeckContext, client: net.Socket, cmd: TCmd): TResponse {
  const notification = context.notifications[socketId(client)];

  if (notification) {
    if (cmd.list.length > 0) {
      for (let i = 0; i < cmd.list.length; i++) {
        const key = cmd.list[i].key;
        const value = cmd.list[i].value;
        if (notification[key] !== undefined) {
          i++;
          notification[key] = value === "true";
        }
      }
    }
  }

  const data: IHash<string> = {
    transport: notification.transport ? "true" : "false",
    slot: notification.slot ? "true" : "false",
    remote: notification.remote ? "true" : "false",
    configuration: notification.configuration ? "true" : "false",
  };

  return new TResponse(209, "notify", data);
}

function handleRemoteInfo(context: THyperdeckContext, client: net.Socket, cmd: TCmd): TResponse {
  return new TResponse(210, "remote info", { enabled: "true", override: "true" });
}

function handleSlotInfo(context: THyperdeckContext, client: net.Socket, cmd: TCmd, unmount: boolean = false): TResponse {
  let data = null;
  if (unmount !== true && cmd && (cmd.dict["slot id"] === "1")) {
    data = {
      "slot id": cmd.dict["slot id"],
      "status": cmd.dict["slot id"] === context.slotId.toString() ? "mounted" : "none",
      "volume name": "CasparCG-" + cmd.dict["slot id"],
      "recording time": "0",
      "video format": context.adapter.standard,
    };
  } else {
    data = {
      "slot id": cmd.dict ? cmd.dict["slot id"] : "0",
      "status": "none",
      "volume name": "-",
      "recording time": "0",
      "video format": context.adapter.standard,
    };
  }

  return new TResponse(202, "slot info", data);
}

function handleClipsCount(context: THyperdeckContext, client: net.Socket, cmd: TCmd): TResponse {
  if (context.slotId === 1) {
    return new TResponse(214, "clips count", { "clip count": context.adapter.clips.length.toString() });
  }

  return new TResponse(214, "clips count", { "clip count": "0" });
}

function handleClipsInfo(context: THyperdeckContext, client: net.Socket, cmd: TCmd): TResponse {
  let filter: (TClip) => boolean = null;

  let clips: TClip[] = null;
  if (context.slotId === 1) {
    if (cmd && cmd.dict && cmd.dict["clip id"]) {
      const clipId = parseInt(cmd.dict["clip id"], 10);
      if (clipId !== 0) {
        filter = (c) => c.id === clipId;
      }
    }

    // get list of clips
    clips = filter ? context.adapter.clips.filter(filter) : context.adapter.clips;
  } else {
    clips = [];
  }

  const count = clips.length;
  const obj: IHash<string> = {
    "clip count": count.toString(),
  };
  for (let i = 0; i < count; i++) {
    obj["" + clips[i].id] = clips[i].getName();
  }

  return new TResponse(205, "clips info", obj);
}

function handleQuit(context: THyperdeckContext, client: net.Socket, cmd: TCmd): TResponse {
  client.end();
  return null;
}

function handlePing(context: THyperdeckContext, client: net.Socket, cmd: TCmd): TResponse {
  return responses.default.OK;
}

function handleGoto(context: THyperdeckContext, client: net.Socket, cmd: TCmd): TResponse {
  if (!cmd.dict) {
    return responses.default.INVALID_VALUE;
  }

  if (cmd.dict["slot id"] === "1") {
    return responses.default.OK;
  }

  const clipId = cmd.dict["clip id"];
  if (!clipId) {
    return responses.default.INVALID_VALUE;
  }

  let success: boolean = false;
  if (clipId.substring(0, 1) === "+") {
    success = context.adapter.nextClip(parseInt(clipId.substring(1), 10));
  } else if (clipId.substring(0, 1) === "-") {
    success = context.adapter.previousClip(parseInt(clipId.substring(1), 10));
  } else {
    success = context.adapter.setClip(parseInt(clipId, 10));
  }

  return success ? responses.default.OK : responses.default.INVALID_VALUE;
}

function handlePlay(context: THyperdeckContext, client: net.Socket, cmd: TCmd): TResponse {

  let success: boolean = false;
  if (cmd.dict && cmd.dict.loop) {
    success = context.adapter.setLooping(cmd.dict.loop === "true");
  }

  if (cmd.dict && cmd.dict.speed) {
    success = context.adapter.setSpeed(parseInt(cmd.dict.speed, 10));
  }

  if (cmd.dict && cmd.dict["single clip"]) {
    success = context.adapter.play();
  }

  return success ? responses.default.OK : responses.default.INVALID_VALUE;
}

function handleStop(context: THyperdeckContext, client: net.Socket, cmd: TCmd): TResponse {
  let success: boolean = false;
  success = context.adapter.stop();

  return success ? responses.default.OK : responses.default.INVALID_VALUE;
}

const cmdHandlers = {
  "device info": handleDeviceInfo,
  "ping": handlePing,
  "notify": handleNotify,
  "transport info": handleTransportInfo,
  "remote": handleRemoteInfo,
  "clips count": handleClipsCount,
  "clips get": handleClipsInfo,
  "slot info": handleSlotInfo,
  "goto": handleGoto,
  "play": handlePlay,
  "stop": handleStop,
  "quit": handleQuit,
};

/**
 * Start a TCP Server
 * @param {THyperdeckContext} context
 * @param {net.socket} socket
 */
function on_new_client(context: THyperdeckContext, socket: net.Socket) {
  // Identify this client
  console.log("connected: " + socketId(socket));

  socket.setEncoding("utf8");

  // Put this new client in the list
  context.clients.push(socket);
  context.notifications[socketId(socket)] = { transport: false, remote: false, slot: false, configuration: false };

  // Handle incoming messages from clients.
  socket.on("data", (data: string) => handle_msg(context, socket, data));

  // Remove the client from the list when it leaves
  socket.on("end", () => {
    try {
      context.clients.splice(context.clients.indexOf(socket), 1);
      delete context.notifications[socketId(socket)];
    } catch (e) {
      console.error(e);
    }
  });

  socket.on("error", (err) => {
    // handle errors here
    console.error(err);
  });

  const response: TResponse = handleConnectionInfo();
  try {
    socket.write(response.build());
  } catch (e) {
    // nop
  }
}

function parse_msg(line: string) {
  let cmd: string = null;
  const cmdParamsList: IKeyValue[] = [];
  const cmdParamsDict: IHash<string> = {};

  const colonPos = line.indexOf(":");
  if (colonPos < 1) {
    cmd = line;
  } else {
    cmd = line.substring(0, colonPos).trim();

    if (line.length > (colonPos + 1)) {
      const paramLine: string = line.substring(colonPos + 1).trim();
      let match = null;
      const reg: RegExp = /([^:]+):\s([^\s]+)\b(?!:)/gm;
      // tslint:disable-next-line:no-conditional-assignment
      while (match = reg.exec(paramLine)) {
        const obj: IKeyValue = {
          key: match[1].trim(),
          value: match[2].trim(),
        };
        cmdParamsList.push(obj);
        cmdParamsDict[obj.key] = obj.value;
        reg.lastIndex += 1;
      }
    }
  }

  return new TCmd(cmd, cmdParamsList, cmdParamsDict);
}

function handle_msg(context: THyperdeckContext, client: net.Socket, data: string) {
  try {
    if (!data) { return null; }

    const lines = data.split("\n");
    for (let line of lines) {
      line = line.trim();

      if (line.length === 0) {
        continue;
      }

      const cmd: TCmd = parse_msg(line);
      let result: TResponse = null;

      if (cmd && cmd.name) {
        const handler = cmdHandlers[cmd.name];
        if (handler) {
          result = handler(context, client, cmd);
        } else {
          result = responses.default.UNSUPPORTED;
          console.warn("Unsupported request: " + line);
        }
      }

      if (result !== null) {
        try {
          const msg = result.build();
          client.write(msg);
        } catch (e) {
          // nop
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}

export class THyperdeckContext {
  public server: net.Server;
  public clients: net.Socket[];
  public notifications: Map<string, INotififcationConfig>;
  public adapter: IServerAdapter;
  public slotId: number = 1;

  constructor(server: net.Server, adapter: IServerAdapter) {
    this.server = server;
    this.clients = [];
    this.adapter = adapter;
    this.notifications = new Map<string, INotififcationConfig>();
  }

  public start(port: number, host: string) {
    if (this.server) {
      this.server.listen(port, host);
    }
  }

  public switch(): void {
    // this.slotId = 2;
    // setTimeout(() => this.slotId = 1, 5000);
    for (const client of this.clients) {
      client.end();
    }
  }

  public notify(type: NOTIFICATIONS) {
    let response: TResponse = null;

    switch (type) {
      case NOTIFICATIONS.TRANSPORT:
        response = handleTransportInfo(this, null, null);
        if (response) {
          response.code += 300; // 208 -> 508
          this.broadcast(response.build(), "transport");
        }
        break;
      case NOTIFICATIONS.SLOT:
        response = handleSlotInfo(
          this,
          null,
          new TCmd("slot info", [ { key: "slot id", value: "1" }], { "slot id": "1"}),
          true);
        if (response) {
          response.code += 300; // 208 -> 508
          this.broadcast(response.build(), "slot");
        }
        break;
      default:
        console.log("unknown notify: " + type);
        break;
    }
  }

  /**
   * Send a message to all clients
   *
   */
  private broadcast(message: string, notificationType: string) {
    this.clients.forEach((client) => {
      // Don"t want to send it to sender
      if (this.notifications[socketId(client)][notificationType]) {
          try {
            client.write(message);
          } catch (e) {
            // nop
          }
      }
    });
  }
}

/**
 * Start the server process
 * @param {({net.socket}, {TCmd}) => {TResponse}} messageHandler
 */
function create(adpater: IServerAdapter): THyperdeckContext {
  const context = new THyperdeckContext(null, adpater);

  const server = net.createServer((socket) => on_new_client(context, socket));
  context.server = server;

  server.on("error", (err) => {
    // handle errors here
    console.error(err);
  });

  return context;
}

export default {
  create,
};
