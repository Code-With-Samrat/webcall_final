const ws = require("ws")
const https = require("https")

const server = https.createServer({
    key: fs.readFileSync("cert.key"),
    cert: fs.readFileSync("cert.crt")
})

server.listen(443, () => {
  console.log("Listening on port 443...")
})

let users = []

ws.on("connection", (ws) => {
    const connection = ws

    connection.on("message", (message) => {
        const data = JSON.parse(message.utf8Data)

        const user = findUserSync(data.username)

        switch(data.type) {
            case "store_user":

                if (user != null) {
                    return
                }

                const newUser = {
                     conn: connection,
                     username: data.username
                }

                users.push(newUser)
                console.log(newUser.username)
                break
            case "store_offer":
                if (user == null)
                    return
                user.offer = data.offer
                break
            
            case "store_candidate":
                if (user == null) {
                    return
                }
                if (user.candidates == null)
                    user.candidates = []
                
                user.candidates.push(data.candidate)
                break
            case "send_answer":
                if (user == null) {
                    return
                }

                sendData({
                    type: "answer",
                    answer: data.answer
                }, user.conn)
                break
            case "send_candidate":
                if (user == null) {
                    return
                }

                sendData({
                    type: "candidate",
                    candidate: data.candidate
                }, user.conn)
                break
            case "join_call":
                if (user == null) {
                    return
                }

                sendData({
                    type: "offer",
                    offer: user.offer
                }, connection)
                
                user.candidates.forEach(candidate => {
                    sendData({
                        type: "candidate",
                        candidate: candidate
                    }, connection)
                })

                break
        }
    })

    connection.on("close", (reason, description) => {
        users.forEach(user => {
            if (user.conn == connection) {
                users.splice(users.indexOf(user), 1)
                return
            }
        })
    })
})

function sendData(data, ws) {

   ws.send(JSON.stringify(data));
        

}

function findUserSync(username) {
    for (let i = 0;i < users.length;i++) {
        if (users[i].username == username)
            return users[i]
    }
    return null
}
