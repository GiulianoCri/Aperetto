
//Inizailizzazione del server
const express=require('express');
const path = require("path");
const app=express();

//Impostiamo la porta
const PORT=3000;
const HOST='0.0.0.0';

//Impostiamo le rotte
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


//SESSIONI

const session = require('express-session'); 
const pgSession = require('connect-pg-simple')(session); 
const { Pool } = require('pg');

const pgPool = new Pool({
  connectionString: "postgresql://postgres:GiuAlvMicCri@db.ocoztbtixgjdfadqoxtn.supabase.co:5432/postgres"
});

//setup della gestione delle sessioni
app.use(session({
  store: new pgSession({
    pool: pgPool,
    tableName: 'session'  //qui è importante specificare il nome giusto
  }),
  secret: 'una_stringa_segreta_molto_lunga', 
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24, //impostiamo la durata del cookie pari a 24 ore
    httpOnly: true //per non far leggere il cookie nel client (sicurezza)
  }
}));

//AUTENTICAZIONE
app.use(express.json()); //consente agli handler di leggere il body (renza questa riga la funzione req.body da errore)

/*
Use serve per creare un middleware, un ulteriore operazione che la richiesta subisce prima di raggiungere destinazione. 
IMPORTANTE: use applica un middleware a tutte le richieste in entrata.
IMPORTANTE: l'ordine in cui i middleware sono scritti nel mio file, sarebbe lo stesso con cui vengono applicati (app.use(espress.static(ROOT)) viene applicato prima di app.use(express.json()) )
IMPORTANTE: è necessario che certi middleware vengano scritti prima di alcine handler (esempio app.use(express.json()) deve essere scritto prima di req.body negli handler)
*/

const bcrypt = require('bcrypt') //usiamo bcrypt per fare un hashing della password

app.get('/api/me', (req, res) => {

    //req.session.user ritorna la sessione per l'utente se è presente
    if (req.session.user) {
        
        //se c'è una sessione attiva allora ritorno all'utente i suoi dati
        res.json(req.session.user);
    } else {
        //se non c'è una sessione, mando il codice 401 (non autorizzato)
        res.status(401).json({ error: "Non sei loggato" });
    }
});

app.post("/api/login", async (req,res) =>{
    const {email, password} = req.body; //anche qui passo i dati utente tramite il body

    //console.log("ricevuti: " + email + ", " + password)

    if (!email || !password) {
        return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    //effettuo una select sul database per cercare l'utente
    const { data: user, error } = await supabase
        .from('consumer')
        .select('*')
        .eq('email', email) //lo cerchiamo rispetto alla mail
        .single();

    if (!user || error) {
        //401 -> utente non autorizzato
        return res.status(401).json({ error: "Utente non trovato" });
    }

    //a stringhe uguali corrispondono hash uguali
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

    if(isPasswordCorrect){
        
        //faccio partire una sessione e anche qui salvo i dati utente di base
        req.session.user = { 
            id: user.id, 
            username: user.username, 
            email: user.email 
        };

        res.json({ message: "Login effettuato!", user: req.session.user});
    } else {
        res.status(401).json({ error: "Password errata" });
    }

})




app.post("/api/register", async (req, res) =>{
    const {email, password} = req.body;  //richiediamo il body dalla richiesta (il body contiene i dati utente)

    //console.log("ricevuti: " + username +", "+ email +", " + password)

    if (!email || !password) {
        return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    //rifaccio il controllo sulla password (questo è un controllo forte, il server non è alterabile)
    if (password.length < 8) {
        return res.status(400).json({ error: "La password deve avere almeno 8 caratteri" });
    }

    try {
        
        //uso il sale nella funzione di hashing
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        
        const { data, error } = await supabase
            .from('consumer')
            .insert([
                { 
                    email: email, 
                    password_hash: hash //noi inseriamo nel database l'hashing della password
                }
            ])
            .select();

        
        //quando il vincolo di chiave sulla mail è stato violato, allora postrgre restituisce il codice di errore 23505 IMPORTANTE: se non usate postgresql c'è un altro codice di errore
        if (error) {
            if (error.code === '23505') { //se la mail è in uso, notifico l'utente con un codice 400
                return res.status(400).json({ error: "Questa email è già registrata" });
            }
            throw error;
        }

        //faccio partire una nuova sessione e riempio il campo "sess" con i dati utente di base
        req.session.user = { 
            id: data[0].id,
            email: data[0].email 
        };

       
        res.status(201).json({ 
            message: "Utente creato con successo!",
            user: req.session.user //mandiamo i dati all'utente (non serve in realtà)
        });

    } catch (err) {
        console.error("Errore registrazione:", err.message, err.stack);
        res.status(500).json({ error: "Errore interno del server" });
    }

})
//AVVIO SERVER
app.listen(PORT,HOST,()=>{
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});