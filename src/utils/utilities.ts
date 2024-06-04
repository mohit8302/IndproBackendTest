// Function to generate a random string of given length
export function getRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// Function to convert an email address into a safe filename
export function emailToFilename(email: string): string {
    // Replace '@' with '_at_' and other special characters with '_'
    return email.replace(/[@]/g, '_at_').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function capitalizeFirstLetter(input: string): string {
    if (!input) {
      return input;
    }
    return input.charAt(0).toUpperCase() + input.slice(1);
  }
  