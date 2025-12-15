// app/sitemap.ts
// Sitemap dinamica per reping.it

import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://reping.it';
  
  // Lista città
  const cities = [
    'ancona', 'bari', 'bergamo', 'bologna', 'brescia', 'cagliari', 'catania',
    'firenze', 'genova', 'livorno', 'milano', 'modena', 'napoli', 'padova',
    'palermo', 'pescara', 'rimini', 'roma', 'salerno', 'siena', 'torino',
    'trento', 'treviso', 'trieste', 'varese', 'verona', 'vicenza'
  ];
  
  // Settori
  const sectors = ['horeca', 'food-beverage'];
  
  // Topic SEO
  const topics = ['pianificazione-percorsi', 'gestione-clienti'];
  
  // Pagine principali (statiche)
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
  
  // Genera pagine SEO dinamiche
  const seoPages: MetadataRoute.Sitemap = [];
  
  for (const sector of sectors) {
    for (const city of cities) {
      for (const topic of topics) {
        seoPages.push({
          url: `${baseUrl}/agenti-${sector}-${city}/${topic}`,
          lastModified: new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }
  }
  
  return [...mainPages, ...seoPages];
}

