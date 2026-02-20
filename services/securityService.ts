
export class SecurityService {
  // En production, on utiliserait Web Crypto API (SubtleCrypto)
  // Ici, on simule un chiffrement AES-256 pour la démonstration
  
  static async encrypt(text: string): Promise<string> {
    if (!text) return text;
    // Simulation : inversion + base64 + préfixe 'enc:'
    const encoded = btoa(text.split('').reverse().join(''));
    return `enc:${encoded}`;
  }

  static async decrypt(cipher: string): Promise<string> {
    if (!cipher || !cipher.startsWith('enc:')) return cipher;
    const raw = cipher.replace('enc:', '');
    try {
      return atob(raw).split('').reverse().join('');
    } catch (e) {
      return "DÉCHIFFREMENT_ERREUR";
    }
  }

  static generateVaultKey(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }
}
