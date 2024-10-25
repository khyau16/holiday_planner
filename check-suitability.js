const request = require('request');

const Promise = require('promise');

const getCountryLanguage = (country, callback) => {
    const url = 'https://restcountries.com/v3.1/name/'+country;
    request({url: url, json: true}, (error, response) => {
        if(error){
            return console.log(error);
        }
        // console.log(response.body[0]);
        const language = response.body[0].languages;
        callback(language);
    })

}

const checkSuitability = (userLanguage, country) => {
    return new Promise((resolve, reject) => {
        getCountryLanguage(country, (data) => {
            if(!data){
                return resolve(false);
            }
            let isSuitable = false;
            for(const language in data){
                if(data[language].toLowerCase() === userLanguage.toLowerCase()){
                    isSuitable = true;
                    break;
                }
            }
            resolve(isSuitable);
        })
    })
}


//for one language

// const checkSuitability = (userLanguage, country, callback) =>{
//     getCountryLanguage(country, (data) => {
//         let isSuitable = false;
//         for(const language in data){
//             if(data[language] === userLanguage){
//                 isSuitable = true;
//                 break;
//             }
//         }
//         callback(isSuitable);
//     })
// }

// checkSuitability('English', country , (result) => {
//     console.log(result);
// })

//for language array

// const checkSuitability = (userLanguages, country, callback) => {
//     getCountryLanguage(country, (data) => {
//         let isSuitable = userLanguages.some((userLang) => {
//             for (const language in data) {
//                 if (data[language] === userLang) {
//                     return true;
//                 }
//             }
//             return false;
//         });
//         callback(isSuitable);
//     });
// }

// checkSuitability(['Chinese','Malay'], country, (result) => {
//     console.log(result);
// })

module.exports = checkSuitability;

