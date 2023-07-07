const Socket = new WebSocket("wss://webcall.onrender.com:443")

// Handle WebSocket connection events
Socket.addEventListener("open", event => {
  console.log("WebSocket connection established.");
});


Socket.addEventListener("close", event => {
  console.log("WebSocket connection closed.");
});

Socket.addEventListener("error", event => {
  console.log("WebSocket connection error:", event);
});

// Send data to the server

Socket.onmessage = (event) => {
  handleSignallingData(JSON.parse(event.data))
}

function handleSignallingData(data) {
  switch (data.type) {
    case "offer":
      peerConn.setRemoteDescription(data.offer)
      createAndSendAnswer()
      break
    case "candidate":
      peerConn.addIceCandidate(data.candidate)
  }
}

function createAndSendAnswer() {
  peerConn.createAnswer((answer) => {
    peerConn.setLocalDescription(answer)
    sendData({
      type: "send_answer",
      answer: answer
    })
  }, error => {
    console.log(error)
  })
}

const leaveMeetingButton = document.getElementById('leave-meeting-button');
leaveMeetingButton.addEventListener('click', leaveMeeting);


let localStream;
let peerConn;
let peerConnections=[]; 
let username;

async function joinCall() {

  username = document.getElementById("username-input2").value

  let notes = JSON.parse(localStorage.getItem("user"))

  for (i = 0; i < notes.length; i++) {
    if (notes[i].name == username) {
      username = notes[i].number
    }
    else if (notes[i].name == notes[i].name && notes[i].number != notes[i].number) {
      console.log("same matching name!pls remove it")
    }
    console.log(notes[i].number)
  }




  document.getElementById("video-call-div").style.display = "inline";
  document.getElementById("body2").style.background ="black"



  // Use getUserMedia instead of getDisplayMedia for video and audio
  await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).then((stream) => {


    let localStream = stream;
    document.getElementById("local-video").srcObject = localStream;



    let configuration = {
      iceServers: [{
        "urls": ["stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302"
        ]
      }]
    };

    peerConn = new RTCPeerConnection(configuration);
    peerConnections.push(peerConn);
    console.log(peerConnections)

    localStream.getTracks().forEach((track) => {
      peerConn.addTrack(track, localStream)
      console.log('localStream tracks added');
    });

    peerConn.ontrack = (e) => {
      
        // If there are only two people in the call, show the remote stream in the existing remote video element
           document.getElementById("remote-video").srcObject = e.streams[0];
    }
    

    peerConn.onicecandidate = ((e) => {
      if (e.candidate == null) {
        return;
      }
      sendData({
        type: "store_candidate",
        candidate: e.candidate
      });
    });
    sendData({
      type: "join_call"
    })
  }).catch((error) => {
    console.error("error baby :" + error)
  })



}



function sendData(data) {

  data.username = username
  Socket.send(JSON.stringify(data));

}

function contact() {
  document.getElementById('contact-body').style.display = "inline"
  document.getElementById("body2").style.background = "white"
  shownotes();

}
function nameplate() {
  document.getElementById("name-contact").style.display = "block"

}
function addname() {
  let note = localStorage.getItem("user");
  let name = document.getElementById("save-name");
  let number = document.getElementById("save-number");

  document.getElementById("name-contact").style.display = "none";


  let noteobj = []; // Initialize noteobj as an empty array

  if (note != null) {
    try {
      noteobj = JSON.parse(note);
    } catch (error) {
      console.error("Error parsing 'user' value from localStorage:", error);
    }
  }

  let pObj = {
    name: name.value,
    number: number.value
  };

  noteobj.push(pObj);

  localStorage.setItem("user", JSON.stringify(noteobj));

  shownotes();
  name.value = "";
  number.value = "";
}

function shownotes() {
  let note = localStorage.getItem("user");

  let noteobj = [];

  if (note != null) {
    try {
      noteobj = JSON.parse(note);
    } catch (error) {
      console.error("Error parsing 'user' value from localStorage:", error);
    }
  }

  let html = "";

  if (Array.isArray(noteobj)) { // Check if noteobj is an array
    noteobj.forEach(function (element, index) {
      html += `<div id="list">${element.name}</div>
               <button class="call" id=${index} onclick="call(this.id)">call</button>
               <button class='delete' id="${index}" onclick="delet(this.id)">delete</button>
               <div id="number-seen-div">${element.number}</div>
               <img id="edit-option" src="https://cdn-icons-png.flaticon.com/512/84/84380.png" onclick="editContact(${index})">`;
    });
  }

  if (noteobj.length === 0) {
    document.getElementById('innerhtml-body').innerHTML = "<h1 id='defult-dis'>please add a contact !<h1>";
  }
  else {
    document.getElementById('innerhtml-body').innerHTML = html;
  }
}


function call(index) {
  username = document.getElementById("username-input2")

  let note = JSON.parse(localStorage.getItem("user"))

  document.getElementById("contact-body").style.display = "none";

  username.value = note[index].number;
  console.log("index" + index)

}


function delet(index) {
  let note = localStorage.getItem("user");

  let noteobj = [];

  if (note != null) {
    try {
      noteobj = JSON.parse(note);
    } catch (error) {
      console.error("Error parsing 'user' value from localStorage:", error);
    }
  }
  noteobj.splice(index, 1);
  localStorage.setItem("user", JSON.stringify(noteobj));
  shownotes();


}

function cancelContact() {
  document.getElementById("name-contact").style.display = "none";

}

function leaveMeeting() {
  sendData({
    type: "leave_call"
  });

  // Disable the remote video of the user who has left the call
  const remoteVideo = document.getElementById("remote-video");
  localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);

  // Close the RTCPeerConnection
  if (peerConn) {
    peerConn.close();
  }

  // Disconnect the WebSocket connection
  if (webSocket) {
    webSocket.close();
  }

  // Stop the local media stream
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  // Hide the video call UI
  document.getElementById("video-call-div").style.display = "none";
}
// Function to mute/unmute audio
function muteAudio() {
  localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
}

// Function to mute/unmute video
function muteVideo() {
  localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
}

function editContact(index) {

  let note = localStorage.getItem("user");
  let noteobj = [];

  if (note != null) {
    try {
      noteobj = JSON.parse(note);
    } catch (error) {
      console.error("Error parsing 'user' value from localStorage:", error);
    }
  }

  let name = document.getElementById("save-name");
  let number = document.getElementById("save-number");
  let saveBtn = document.getElementById("button-save-name");

  // Set the input fields to the values of the contact being edited
  name.value = noteobj[index].name;
  number.value = noteobj[index].number;

  // Display the edit form
  document.getElementById("name-contact").style.display = "block";

  // Update the contact when the save button is clicked
  saveBtn.onclick = function () {
    noteobj[index].name = name.value;
    noteobj[index].number = number.value;
    localStorage.setItem("user", JSON.stringify(noteobj));
    document.getElementById("name-contact").style.display = "none";
    shownotes();
  }


}
