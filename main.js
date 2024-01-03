let APP_ID = "126575bf92af4f6b8740a1486ac77448";
let token = null;
let uid = String(Math.floor(Math.random() * 10000));
let client;
let channel;

let localeStream;
let remoteStream;
let peerConnection;

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

  channel = client.createChannel("roomID");
  await channel.join();

  channel.on("MemberJoined", handelUserJoined);
  channel.on("MemberJoined", handelMessageFromPeer);

  localeStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });
  document.getElementById("user-1").srcObject = localeStream;
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

  if (!localeStream) {
    localeStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    document.getElementById("user-1").srcObject = localeStream;
  }

  localeStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localeStream);
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

let addAnswer = async (awnser) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.currentRemoteDescription(answer);
  }
};

init();
