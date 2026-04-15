
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

//pagina Luoghi
app.get('/luogo',(req,res)=>{
    res.sendFile(path.join(ROOT,'luogo.html'));
});




//Connesione a supabase
const { createClient } = require('@supabase/supabase-js');
const supabaseApi= 'https://ocoztbtixgjdfadqoxtn.supabase.co';
const supabaseApiKey= 'sb_publishable_YyR37XC53HHN1lm8tmbfMA_zreVDEUU';
const supabase = createClient(supabaseApi, supabaseApiKey);

//Funzione per aggiungere l'url dell'immagine a un luogo
const aggiungiUrl = (luogo) => {
    const { data: urlData } = supabase.storage
        .from('foto')
        .getPublicUrl(luogo.immagine);
    return { 
        ...luogo, 
        immagine: urlData.publicUrl 
    };
};


//API


//Ottengo tutti i luoghi dal database
app.get('/api/luoghi', async (req, res) => {
    const { data, error } = await supabase
        .from('Luoghi')
        .select('*');
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    //per debug
    console.log("DATA:", data);
    console.log("ERROR:", error);

    //aggiungo l'url dell'immagine
    res.json(data.map(aggiungiUrl));
});
//Ottengo un luogo specifico dal database
app.get('/api/luoghi/:id', async (req, res) => {
    const id = req.params.id;
    const { data, error } = await supabase
        .from('Luoghi')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // restituisce oggetto singolo, non array     

    console.log("ID:", id, "| DATA:", data, "| ERROR:", error);

    if (error) return res.status(500).json({ error: error.message });
    if (!data)  return res.status(404).json({ error: 'Luogo non trovato' });

    res.json(aggiungiUrl(data));
});


//AVVIO SERVER
app.listen(PORT,HOST,()=>{
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});