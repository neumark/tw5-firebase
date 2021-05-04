export interface Config {
  deploy: {
      apiRegion: string,
      targets?: string
  },
  build?: {
    env: string,
    timestamp: number
  }
  wiki: {
      wikiName: string,
      recipe: string,
      apiEndpoint: string
  },
  firebase: {
      apiKey: string,
      authDomain: string,
      databaseURL?: string,
      projectId: string,
      storageBucket: string,
      messagingSenderId: string,
      appId: string,
      measurementId?: string
  }
}

export interface Keys {
    firebaseToken: string,
    refreshToken: string
}