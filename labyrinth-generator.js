class LabyrinthGenerator {
    constructor() {
        this.isGenerating = false;
    }
    
    async generateLabyrinthText(theme, style, complexity) {
        if (this.isGenerating) return null;
        
        this.isGenerating = true;
        
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a master labyrinth creator crafting immersive, atmospheric labyrinth descriptions. 
                        Create a detailed description of a mysterious labyrinth with a rich atmosphere, striking visuals, 
                        and enigmatic biomes. Include details about the materials, textures, architecture, lighting, and any 
                        unique features a traveler might encounter. Mention at least three distinct sections or biomes in the labyrinth,
                        and include mysterious elements that hint at its origins or purpose.`
                    },
                    {
                        role: "user",
                        content: `Create a detailed description of a labyrinth with the theme: ${theme}, 
                        in the style: ${style}, with complexity level: ${complexity}/10. 
                        The description should include vivid details about the environment, atmosphere, and unique features.
                        Format your response as:
                        Title: [A captivating title for the labyrinth - keep it short and intriguing]
                        
                        [A 150-200 word description of the labyrinth with vivid, detailed imagery about its appearance, biomes, textures, lighting, and atmosphere.]
                        
                        Response should not include any additional text, instructions, or clarifications.`
                    }
                ]
            });
            
            const labyrinthText = completion.content;
            
            // Extract title and description
            const titleMatch = labyrinthText.match(/Title:\s*(.*?)(?:\n|$)/);
            const title = titleMatch ? titleMatch[1].trim() : "Mysterious Labyrinth";
            
            // Remove title line to get description
            const description = labyrinthText.replace(/Title:\s*(.*?)(?:\n|$)/, "").trim();
            
            return {
                title,
                description
            };
        } catch (error) {
            console.error("Error generating labyrinth description:", error);
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }
    
    async generateLabyrinthImage(description) {
        if (this.isGenerating) return null;
        
        this.isGenerating = true;
        
        try {
            // Generate image based on the description
            const result = await websim.imageGen({
                prompt: `A detailed, atmospheric view of the entrance to a mystical labyrinth: ${description}`,
                aspect_ratio: "16:9",
            });
            
            return result.url;
        } catch (error) {
            console.error("Error generating labyrinth image:", error);
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }
    
    async generateWallTexture(biome) {
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are an expert at creating detailed texture descriptions for labyrinth walls.`
                    },
                    {
                        role: "user",
                        content: `Create a detailed description of wall textures for a labyrinth biome: ${biome}.
                        Include details about materials, colors, patterns, and any unique features or weathering.
                        Keep it concise (50-70 words) but highly visual.`
                    }
                ]
            });
            
            const textureDescription = completion.content;
            
            // Generate texture image based on the description
            const result = await websim.imageGen({
                prompt: `Seamless wall texture. Top-down perspective. ${textureDescription}`,
                width: 512,
                height: 512,
            });
            
            return {
                description: textureDescription,
                imageUrl: result.url
            };
        } catch (error) {
            console.error("Error generating wall texture:", error);
            throw error;
        }
    }
    
    async generateBiomeTextures(description) {
        // Extract potential biomes from description
        const biomeKeywords = [
            "forest", "crystal", "cave", "ancient", "desert", "ice", "lava", "ocean", 
            "temple", "ruins", "garden", "mountain", "shadow", "light", "mechanical", 
            "overgrown", "stone", "bone", "void", "ethereal", "celestial"
        ];
        
        // Find biomes in the description
        const foundBiomes = biomeKeywords.filter(biome => 
            description.toLowerCase().includes(biome.toLowerCase())
        );
        
        // Use 3 biomes - either found in description or default ones
        const biomesToUse = foundBiomes.length >= 3 
            ? foundBiomes.slice(0, 3) 
            : [...foundBiomes, ...["stone", "ancient", "mystical"].filter(b => !foundBiomes.includes(b))].slice(0, 3);
        
        // Generate textures for each biome
        const textures = await Promise.all(
            biomesToUse.map(biome => this.generateWallTexture(biome))
        );
        
        return {
            biomes: biomesToUse,
            textures: textures
        };
    }
    
    async saveLabyrinth(title, description, imageUrl, textures) {
        // Generate maze data - will be used by the engine
        const mazeData = this.generateMazeData(textures);
        
        // Save to database
        return await labyrinthRoom.createLabyrinth({
            title,
            description,
            imageUrl,
            textures,
            mazeData,
            createdAt: new Date().toISOString()
        });
    }
    
    generateMazeData(textures) {
        // Create a random seed for the procedural generation
        const seed = Math.floor(Math.random() * 1000000);
        
        return {
            seed,
            biomes: textures.biomes,
            textureUrls: textures.textures.map(t => t.imageUrl),
            width: 100, // Base size - will expand infinitely
            height: 100,
            difficulty: Math.floor(Math.random() * 5) + 3, // 3-7 difficulty
            minPathLength: 50 + Math.floor(Math.random() * 100) // Minimum path length to "exit"
        };
    }
}

// Initialize generator
const labyrinthGenerator = new LabyrinthGenerator();

