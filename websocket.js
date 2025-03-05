class LabyrinthRoom {
    constructor() {
        this.socket = new WebsimSocket();
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        this.socket.onmessage = (event) => {
            const data = event.data;
            switch (data.type) {
                case "connected":
                    console.log(`Client ${data.clientId}, ${data.username} connected`);
                    break;
                case "disconnected":
                    console.log(`Client ${data.clientId}, ${data.username} disconnected`);
                    break;
                case "playerMove":
                    window.dispatchEvent(new CustomEvent('player-moved', {
                        detail: {
                            clientId: data.clientId,
                            username: data.username,
                            x: data.x, 
                            y: data.y,
                            direction: data.direction
                        }
                    }));
                    break;
                default:
                    console.log("Received event:", data);
            }
        };
    }
    
    sendPlayerPosition(x, y, direction) {
        this.socket.send({
            type: "playerMove",
            x,
            y,
            direction
        });
    }
    
    async createLabyrinth(data) {
        try {
            return await this.socket.collection('labyrinth').create(data);
        } catch (error) {
            console.error("Error creating labyrinth:", error);
            throw error;
        }
    }
    
    getLabyrinthList() {
        return this.socket.collection('labyrinth').getList();
    }
    
    subscribeToLabyrinths(callback) {
        return this.socket.collection('labyrinth').subscribe(callback);
    }
    
    async getLabyrinthById(id) {
        const labyrinths = await this.socket.collection('labyrinth').filter({ id }).getList();
        return labyrinths[0] || null;
    }
}

// Initialize room
const labyrinthRoom = new LabyrinthRoom();

