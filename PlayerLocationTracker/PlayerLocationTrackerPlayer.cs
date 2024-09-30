using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Terraria.ModLoader;
using Terraria;
using System.IO;
using Terraria.ModLoader;
using Newtonsoft.Json.Linq;
using System.Net.Http;

namespace PlayerLocationTracker
{
    public class PlayerLocationTrackerPlayer : ModPlayer
    {
        private string previousBiome = "";

        public override void PreUpdate()
        {
            string currentBiome = DetermineBiome();

            if (currentBiome != previousBiome)
            {
                int x = Player.position.ToTileCoordinates().X;
                int y = Player.position.ToTileCoordinates().Y;

                StoreLocationData(Player.name, currentBiome, x, y);

                previousBiome = currentBiome;
            }
        }

        private string DetermineBiome()
        {
            if (Player.ZoneCorrupt) 
                return "Corruption";
            else if (Player.ZoneCrimson) 
                return "Crimson";
            else if (Player.ZoneHallow) 
                return "Hallow";
            else if (Player.ZoneDesert) 
                return "Desert";
            else if (Player.ZoneDungeon)
                return "Dungeon";
            else if (Player.ZoneJungle)
                return "Jungle";
            else if (Player.ZoneSnow) 
                return "Snow";
            else if (Player.ZoneGlowshroom)
                return "Glowing Mushroom";
            else if (Player.ZoneMeteor) 
                return "Meteorite";
            else if (Player.ZoneBeach) 
                return "Beach";
            else if (Player.ZoneUnderworldHeight)
                return "Underworld";
            else if (Player.ZoneSkyHeight)
                return "Sky";
            else if (Player.ZoneRain) 
                return "Rain";
            else if (Player.ZoneSandstorm) 
                return "Sandstorm";
            else if (Player.ZoneOldOneArmy)
                return "Old One's Army";
            else if (Player.ZoneGranite) 
                return "Granite";
            else if (Player.ZoneMarble)
                return "Marble";
            else if (Player.ZoneLihzhardTemple) 
                return "Lihzahrd Temple";
            else if (Player.ZoneTowerSolar)
                return "Solar Pillar";
            else if (Player.ZoneTowerVortex) 
                return "Vortex Pillar";
            else if (Player.ZoneTowerNebula) 
                return "Nebula Pillar";
            else if (Player.ZoneTowerStardust) 
                return "Stardust Pillar";
            else
                return "Surface";
        }

        private void StoreLocationData(string playerName, string biome, int x, int y)
        {
            try
            {
                string directoryPath = Path.Combine(Main.SavePath, "PlayerLocationData");
                
                if (!Directory.Exists(directoryPath))
                {
                    Directory.CreateDirectory(directoryPath);
                }

                string filePath = Path.Combine(directoryPath, "PlayerLocationData.txt");

                using (StreamWriter writer = new StreamWriter(filePath, true))
                {
                    writer.WriteLine(biome);
                }

                Mod.Logger.Info($"Location data saved: {playerName} is in {biome} at ({x}, {y})");
            }
            catch (IOException ex)
            {
                Mod.Logger.Error($"Error writing location data: {ex.Message}");
            }
        }
    }
}