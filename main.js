let APP_ID = "126575bf92af4f6b8740a1486ac77448";
let token = null;
let uid = String(Math.floor(Math.random() * 10000));
let client;
let channel;
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let roomID = urlParams.get("room");

if (!roomID) {
  window.location = "lobby.html";
}

let localStream;
let remoteStream;
let peerConnection;
let constraints = {
  video: {
    width: { min: 640, ideal: 1920, max: 1920 },
    height: { min: 480, ideal: 1080, max: 1080 },
  },
  audio: true,
};

//google free stun servers
const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.1.google.com:19302", "stun:stun2.1.google.com:19302"],
    },
  ],
};

let init = async () => {
  client = await AgorRtm.createInstance(APP_ID);
  await client.login({ uid, token });

  channel = client.createChannel(roomID);
  await channel.join();

  channel.on("MemberJoined", handelUserJoined);
  channel.on("MemberLeft", handelUserLeft);

  channel.on("MemberJoined", handelMessageFromPeer);

  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  document.getElementById("user-1").srcObject = localStream;
};

let handelUserLeft = (MemberId) => {
  document.getElementById("user-2").style.display = "none";
  document.getElementById("user-1").classList.remove("small-frame");
};

//listener for messages ,offers ,answers and candidates
let handelMessageFromPeer = async (message, MemberId) => {
  message = JSON.stringify(message.text);
  if (message.type === "offer") {
    createAnswer(MemberId, message.offer);
  }
  if (message.type === "answer") {
    createAnswer(message.answer);
  }
  if (message.type === "candidate") {
    if (peerConnection) {
      peerConnection.addIceCandidate(message.candidate);
    }
  }
};

//notify when a user joined our room
let handelUserJoined = async (MemberId) => {
  console.log("New user joined ", MemberId);
  createOffer(MemberId);
};

let createPeerConnection = async (MemberId) => {
  peerConnection = new RTCPeerConnection(servers);
  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;
  document.getElementById("user-2").style.display = "block";
  document.getElementById("user-1").classList.add("small-frame");

  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    document.getElementById("user-1").srcObject = localStream;
  }

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (e) => {
    e.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (e) => {
    if (e.candidate) {
      client.sendMessageToPeer({
        text: JSON.stringify({ type: "candidate", candidate: e.candidate }),
        MemberId,
      });
      console.log("New ICEcandidate: ", e.candidate);
    }
  };
};

let createOffer = async (MemberId) => {
  await createPeerConnection(MemberId);
  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  client.sendMessageToPeer({
    text: JSON.stringify({ type: "offer", offer }),
    MemberId,
  });
};

let createAnswer = async (MemberId, offer) => {
  await createPeerConnection(MemberId);

  await peerConnection.setRemoteDescription(offer);

  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  client.sendMessageToPeer({
    text: JSON.stringify({ type: "answer", answer }),
    MemberId,
  });
};

let addAnswer = async (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.currentRemoteDescription(answer);
  }
};

let leaveChannel = async () => {
  await channel.leave();
  await client.logout();
};

let toggleCamera = async () => {
  let videoTrack = localStream
    .getTracks()
    .find((track) => track.kind === "video");
  if (videoTrack.enabled) {
    videoTrack.enabled = false;
    document.getElementById("mute-cam").style.display = "block";
    document.getElementById("unmute-cam").style.display = "none";
  } else {
    videoTrack.enabled = true;
    document.getElementById("unmute-cam").style.display = "block";
    document.getElementById("mute-cam").style.display = "none";
  }
};

let toggleMic = async () => {
  let audioTrack = localStream
    .getTracks()
    .find((track) => track.kind === "audio");
  if (audioTrack.enabled) {
    audioTrack.enabled = false;
    document.getElementById("mute-mic").style.display = "block";
    document.getElementById("unmute-mic").style.display = "none";
  } else {
    audioTrack.enabled = true;
    document.getElementById("unmute-mic").style.display = "block";
    document.getElementById("mute-mic").style.display = "none";
  }
};

document.getElementById("camera-btn").addEventListener("click", toggleCamera);
document.getElementById("mic-btn").addEventListener("click", toggleMic);
window.addEventListener("beforeunload", leaveChannel);

init();
