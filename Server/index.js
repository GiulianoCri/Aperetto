
//Inizailizzazione del server
const express=require('express');
const path = require("path");
const app=express();


const PORT=3000;
const HOST='0.0.0.0';
//permetto al server di accedere alla cartella client
const ROOT = path.join(__dirname,'..','client');
app.use(express.static(ROOT)); 

//importo le pagine
//pagina home
app.get('/',(req,res)=>{
    res.sendFile(path.join(ROOT,'index.html'));
});

//pagina login
app.get('/login',(req,res)=>{
    res.sendFile(path.join(ROOT,'login.html'));
});




//Connesione a supabase
const { createClient } = require('@supabase/supabase-js');
const supabaseApi= 'https://ocoztbtixgjdfadqoxtn.supabase.co';
const supabaseApiKey= 'sb_publishable_YyR37XC53HHN1lm8tmbfMA_zreVDEUU';
const supabase = createClient(supabaseApi, supabaseApiKey);

//Ottengo i luoghi dal database
app.get('/api/luoghi', async (req, res) => {
    const { data, error } = await supabase
        .from('Luoghi')
        .select('*');
    //per debug
    console.log("DATA:", data);
    console.log("ERROR:", error);
    //Per elaborazione foto
    const risultati = data.map(luogo => {
        //dati ricevuti dal database, con il nome del file dell'immagine
        const { data: urlData } = supabase.storage
        .from('foto')
        .getPublicUrl(luogo.immagine); 

        return {
            //resto dei dati del database, con l'aggiunta dell'URL pubblico dell'immagine
            ...luogo,
            //aggiorno il campo immagine con l'URL pubblico ottenuto da Supabase Storage
            immagine: urlData.publicUrl
      };
    });



    if (error) {
        return res.status(500).json({ error: error.message });
    }
    //invio i risultati al client
    res.json(risultati);
});


//AVVIO SERVER
app.listen(PORT,HOST,()=>{
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});