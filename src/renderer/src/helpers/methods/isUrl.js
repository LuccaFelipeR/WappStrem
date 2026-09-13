export const isURL = (inputString) => {
    // Regular expression pattern to match URLs
    var urlPattern = /^(?:http|https?):\/\/(?:www\.)?[^\s.]+\.[^\s]{2,}$|^[^\s]+\.[^\s]{2,}$/i;
    
    // Check if the input string matches the URL pattern
    return urlPattern.test(inputString);
}

export const convertToHttp = (url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    } else {
        return 'http://' + url;
    }
}