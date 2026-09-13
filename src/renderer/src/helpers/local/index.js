export const getUser = () => {
    if (typeof window === 'undefined') {
        return ""
    }
    return JSON.parse(localStorage.getItem('listUser'));
}


export const getParentalPin = (key) => {
    if (!key || typeof window === 'undefined') {
        return ""
    }
    const localItem = localStorage.getItem(key);
    const retrievedUser = localItem && Object.values(JSON.parse(localStorage.getItem(key)))[0].parentalPin;
    return retrievedUser;
}

export const getLocal = (key) => {
    if (!key || typeof window === 'undefined') {
        return ""
    }
    const localItem = localStorage.getItem(key);
    const retrievedUser = localItem && JSON.parse(localItem);
    return retrievedUser;
}