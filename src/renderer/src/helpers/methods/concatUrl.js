export  const concatUrl = (url) => {
    
    const regex = /[^a-zA-Z0-9\s.\-:]/g;
    return url.replace(regex, "").split(".").join("")
}