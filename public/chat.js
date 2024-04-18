import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

document.addEventListener('DOMContentLoaded', async () => {

    const getUsername = async () => {
        try {
            const username = localStorage.getItem("username");
            if (username) {
                // console.log(`Usuario existente: ${username}`);
                return username;
            }

            const res = await fetch("https://random-data-api.com/api/users/random_user");
            const { username: randomUsername } = await res.json();

            localStorage.setItem("username", randomUsername);
            return randomUsername;
        } catch (error) {
            throw new Error("Error al obtener el nombre de usuario:", error);
        }
    };

    const socket = io({
        auth: {
            username: await getUsername(),
            serverOffset: 0
            
        }
    });

    const form = document.getElementById("form");
    const input = document.getElementById("input");
    const messages = document.getElementById("messages");

    const sendTone = new Audio("./notification-sounds/message-send.mp3");
    const receivedTone = new Audio("./notification-sounds/message-received.mp3");

    socket.on("chat message", (msg, serverOffset, username) => {

        try {

            const isOwnMessage = username === localStorage.getItem("username");
            const messageClass = isOwnMessage ? 'send-message' : 'received-message';

            const menssage = `
            <li class="${messageClass}">
                <p>${msg}</p>
                <small>${username}</small>
            </li>`;
        messages.insertAdjacentHTML("beforeend", menssage);
        socket.auth.serverOffset = serverOffset;

        // Scroll hasta el final de los mensajes
        messages.scrollTop = messages.scrollHeight;

        // Reproducir si estamos recibiendo un mensaje
        // receivedTone.play();
        
    } catch (error) {
        throw new error("Error al procesar el mensaje:", error);
    }
    });

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        try {

            if (input.value.trim() !== "") {
                socket.emit("chat message", input.value);
                input.value = "";
            }

            // Reproducir el sonido de envío de mensaje
            sendTone.play();

        } catch (error) {
            throw new error("Error al enviar el mensaje:", error);
        } 
    });

});

