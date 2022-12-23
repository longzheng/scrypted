import { RTCIceCandidate, RTCPeerConnection } from "@koush/werift";
import { Deferred } from "@scrypted/common/src/deferred";
import { RTCAVSignalingSetup, RTCSignalingOptions, RTCSignalingSendIceCandidate, RTCSignalingSession } from '@scrypted/sdk';
import { createRawResponse } from "./werift-util";

export class WeriftSignalingSession implements RTCSignalingSession {
    remoteDescription = new Deferred<any>();

    constructor(public console: Console, public pc: RTCPeerConnection) {
    }

    async getOptions(): Promise<RTCSignalingOptions> {
        return;
    }

    async createLocalDescription(type: "offer" | "answer", setup: RTCAVSignalingSetup, sendIceCandidate: RTCSignalingSendIceCandidate): Promise<RTCSessionDescriptionInit> {
        // werift turn does not seem to work? maybe? sometimes it does? we ignore it here, and that's fine as only 1 side
        // needs turn.
        // stun candidates will come through here, if connection is slow to establish.
        this.pc.onIceCandidate.subscribe(async candidate => {
            await this.remoteDescription.promise;

            this.console.log('local candidate', candidate.candidate, candidate.sdpMid, candidate.sdpMLineIndex);
            sendIceCandidate?.({
                candidate: candidate.candidate,
                sdpMid: candidate.sdpMid,
                sdpMLineIndex: candidate.sdpMLineIndex,
            });
        });

        let ret: RTCSessionDescriptionInit;
        if (type === 'offer') {
            const offer = await this.pc.createOffer();
            if (!sendIceCandidate)
                await this.pc.setLocalDescription(offer);
            else
                this.pc.setLocalDescription(offer);
            ret = createRawResponse(offer);
        }
        else {
            if (!sendIceCandidate)
                await this.remoteDescription.promise;
            const answer = await this.pc.createAnswer();
            if (!sendIceCandidate)
                await this.pc.setLocalDescription(answer);
            else
                this.pc.setLocalDescription(answer);
            ret = createRawResponse(answer);
        }
        return ret;
    }

    async setRemoteDescription(description: RTCSessionDescriptionInit, setup: RTCAVSignalingSetup) {
        this.remoteDescription.resolve(this.pc.setRemoteDescription(description as any));
    }

    async addIceCandidate(candidate: RTCIceCandidateInit) {
        this.console.log('remote candidate', candidate.candidate, candidate.sdpMid, candidate.sdpMLineIndex);
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
}
