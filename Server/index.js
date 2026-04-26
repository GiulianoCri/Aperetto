
//Inizailizzazione del server
const express=require('express');
const path = require("path");
const app=express();


const PORT=3000;
const HOST='0.0.0.0';

//permetto al server di accedere alla cartella client
const ROOT = path.join(__dirname,'..','client');
app.use(express.static(ROOT)); 
app.use(express.json());

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
const supabaseApiKey= 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jb3p0YnRpeGdqZGZhZHFveHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODIwMzIsImV4cCI6MjA5MTM1ODAzMn0.K0tLeh1T-2zjCl3WSvtueTKRQWEadmR1gBXgguALov0';
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
app.get("/api/luoghi/vicini", (req, res) => {
    const { lat, lng } = req.query;

    const risultati = luoghi.map(l => {
        const dist = Math.sqrt(
            Math.pow(l.lat - lat, 2) +
            Math.pow(l.lng - lng, 2)
        );

        return { ...l, dist };
    }).sort((a, b) => a.dist - b.dist);

    res.json(risultati);
});

// Registrazione utente
app.post('/api/registrazione', async (req, res) => {
    console.log("Richiesta ricevuta:", req.body);
    console.log("Tipo password:", typeof req.body.password);
    const { nome, cognome, email, password } = req.body;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { nome, cognome } // salvati nei metadati utente
        }
    });

    if (error) return res.status(400).json({ errore: error.message });

    res.status(200).json({ messaggio: 'Registrazione avvenuta con successo!', data });
});

// Login utente
app.post('/api/login', async (req, res) => {
    console.log("Login ricevuto:", req.body);
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) return res.status(400).json({ errore: error.message });

    res.status(200).json({ messaggio: 'Accesso avvenuto con successo!', data });
});

//AVVIO SERVER
app.listen(PORT,HOST,()=>{
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});