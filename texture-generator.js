class TextureGenerator {
    constructor() {
        this.cachedTextures = {};
    }
    
    async generateTextureFromPrompt(prompt, biome) {
        // Check if we already have this texture cached
        const cacheKey = `${biome}-${prompt.slice(0, 20)}`;
        if (this.cachedTextures[cacheKey]) {
            return this.cachedTextures[cacheKey];
        }
        
        try {
            // Generate texture description
            const description = await this.generateTextureDescription(biome);
            
            // Generate texture image
            const textureUrl = await this.generateTextureImage(description);
            
            // Cache the result
            const result = { description, imageUrl: textureUrl };
            this.cachedTextures[cacheKey] = result;
            
            return result;
        } catch (error) {
            console.error("Error generating texture:", error);
            return null;
        }
    }
    
    async generateTextureDescription(biome) {
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are an expert at creating detailed texture descriptions for labyrinth walls. Focus on unique, visually interesting wall textures that would look convincing in a first-person maze."
                    },
                    {
                        role: "user",
                        content: `Create a detailed description of wall textures for a labyrinth biome: ${biome}.
                        Include details about materials, colors, patterns, and any unique features or weathering.
                        Keep it concise (50-70 words) but highly visual.`
                    }
                ]
            });
            
            return completion.content;
        } catch (error) {
            console.error("Error generating texture description:", error);
            throw error;
        }
    }
    
    async generateTextureImage(description) {
        try {
            const result = await websim.imageGen({
                prompt: `Seamless wall texture. Top-down perspective. ${description}`,
                width: 512,
                height: 512,
            });
            
            return result.url;
        } catch (error) {
            console.error("Error generating texture image:", error);
            throw error;
        }
    }
    
    async generateDefaultTexturesForBiomes() {
        const defaultBiomes = ["stone", "crystalline", "overgrown", "ancient", "desert", "volcanic"];
        const results = [];
        
        for (let i = 0; i < 3; i++) {
            const biome = defaultBiomes[i];
            try {
                const texture = await this.generateTextureFromPrompt("default", biome);
                results.push(texture);
            } catch (error) {
                console.error(`Error generating texture for ${biome}:`, error);
                // Use fallback
                results.push({
                    description: `Default ${biome} texture`,
                    imageUrl: this.getFallbackTextureUrl(i)
                });
            }
        }
        
        return {
            biomes: defaultBiomes.slice(0, 3),
            textures: results
        };
    }
    
    getFallbackTextureUrl(index) {
        // Fallback solid colors as SVG data URIs
        const colors = ['#555', '#775', '#557'];
        const color = colors[index % colors.length];
        
        return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="${color}"/></svg>`;
    }
}

// Initialize
const textureGenerator = new TextureGenerator();

