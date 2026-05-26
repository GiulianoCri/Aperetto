//SERVER

//Funzionalita del server
//Architettura: Express.js (Node.js) + Supabase (PostgreSQL + Storage)
//Responsabilità:
//Serve i file statici del client (HTML/CSS/JS)
//Gestisce l'autenticazione (login/registrazione/logout)
//per due tipi di utente: Consumer e Supplier
//Espone le API REST per locali, recensioni e recupero password
//Gestisce le sessioni server-side tramite express-session


//Inizailizzazione del server


//express è un framework che semplifica la gestione delle richieste http, delle rotte, dei middleware e tanto altro.
const express=require('express');
//path è un modulo di node che semplifica la gestione dei percorsi dei file 
const path = require("path");
//multer è un middleware che semplifica la gestione degli upload di file (usato per l'upload dell'immagine del locale da parte del supplier)
const multer = require('multer');
//express-session: gestisce le sessioni utente server-side tramite cookie.
const session = require('express-session');
//upload è la configurazione di multer, in questo caso stiamo dicendo a multer di salvare i file caricati in RAM (non su disco), così possiamo poi passarli direttamente a supabase storage senza doverli salvare temporaneamente su disco
const upload = multer({ storage: multer.memoryStorage() });
//creazione dell'app express
const app=express();

// Impostiamo la porta
const PORT=3000;
const HOST='0.0.0.0';// ascolta su tutte le interfacce di rete


// Impostiamo le rotte

// ROOT: percorso assoluto alla cartella Client.
// __dirname è la directory dove si trova questo file (Server/),
// con '..' saliamo di un livello e poi entriamo in 'client'.
const ROOT = path.join(__dirname,'..','Client');


// SESSIONI
// configuriamo express-session come middleware, in questo modo ogni richiesta che arriva al server passerà prima da questa configurazione di sessione. La sessione ci permette di mantenere lo stato dell'utente tra le varie richieste, ad esempio per sapere se è loggato o no, e per salvare i suoi dati di base (esempio email, nome) senza doverli inviare dal client ad ogni richiesta. La configurazione che abbiamo messo prevede un segreto (usato per firmare la sessione), e alcune opzioni per i cookie (durata, sicurezza, ecc). Importante: in produzione è consigliabile usare un store di sessioni più robusto (esempio Redis) invece della memoria del server, che è volatile e non scalabile.
app.use(session({
    // firma crittografica del cookie di sessione, usata per garantire l'integrità della sessione e prevenire manomissioni. In produzione, questo dovrebbe essere un valore lungo, complesso e segreto, idealmente caricato da una variabile d'ambiente.
    secret: 'una_stringa_segreta_molto_lunga',
    // non riscrivere la sessione se non modificata
    resave: false,
    // non creare sessione per utenti anonimi
    saveUninitialized: false,
    //configurazione dei cookie che vengono usati per identificare la sessione dell'utente. maxAge è la durata del cookie (in questo caso 1 giorno), httpOnly significa che il cookie non è accessibile tramite JavaScript (aumenta la sicurezza contro attacchi XSS), sameSite: 'lax' aiuta a prevenire attacchi CSRF, secure: false significa che il cookie può essere trasmesso anche su connessioni non sicure (in produzione dovrebbe essere true se si usa HTTPS).
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
        sameSite: 'lax',
        secure: false 
    }
}));
// con questa riga diciamo a express di servire i file statici dalla cartella ROOT, quindi quando il client richiede un file (esempio index.html o uno script js) express lo cercherà in quella cartella
app.use(express.static(ROOT)); 
// con questa riga diciamo a express di interpretare il body delle richieste in formato json, così possiamo accedere ai dati inviati dal client tramite req.body negli handler
app.use(express.json());
/*
Use serve per creare un middleware, un ulteriore operazione che la richiesta subisce prima di raggiungere destinazione. 
IMPORTANTE: use applica un middleware a tutte le richieste in entrata.
IMPORTANTE: l'ordine in cui i middleware sono scritti nel mio file, sarebbe lo stesso con cui vengono applicati (app.use(espress.static(ROOT)) viene applicato prima di app.use(express.json()) )
IMPORTANTE: è necessario che certi middleware vengano scritti prima di alcune handler (esempio app.use(express.json()) deve essere scritto prima di req.body negli handler)
*/

//Rotte per le pagine HTML

// pagina home
// con questa rotta, quando il client fa una richiesta GET alla radice del sito (esempio http://localhost:3000/) allora express risponde inviando il file index.html che si trova nella cartella ROOT
app.get('/',(req,res)=>{
    res.sendFile(path.join(ROOT,'index.html'));
});

// pagina login
app.get('/login',(req,res)=>{
    res.sendFile(path.join(ROOT,'login.html'));
});

// pagina location
app.get('/luogo',(req,res)=>{
    res.sendFile(path.join(ROOT,'luogo.html'));
});

// Rotta esplicita per la pagina di reset password (raggiunta tramite
// link via email che contiene il token come query param ?token=...)
app.get('/reset-password.html', (req, res) => {
    res.sendFile(path.join(ROOT, 'reset-password.html'));
});

// Rotta esplicita per la pagina di reset password (raggiunta tramite
// link via email che contiene il token come query param ?token=...)
app.get('/reset-password.html', (req, res) => {
    res.sendFile(path.join(ROOT, 'reset-password.html'));
});

// CONNESSIONE A SUPABASE
// createClient è la funzione che ci permette di creare un'istanza del client di supabase, a cui poi possiamo fare le query al database e le operazioni di storage. La funzione prende come parametri l'url del nostro progetto supabase e la chiave anonima (public) 
const { createClient } = require('@supabase/supabase-js');
const supabaseApi= 'https://ocoztbtixgjdfadqoxtn.supabase.co';
const supabaseApiKey= 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jb3p0YnRpeGdqZGZhZHFveHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3ODIwMzIsImV4cCI6MjA5MTM1ODAzMn0.K0tLeh1T-2zjCl3WSvtueTKRQWEadmR1gBXgguALov0';
const supabase = createClient(supabaseApi, supabaseApiKey);

// bcrypt: libreria per hashing sicuro delle password.
const bcrypt = require('bcrypt') //usiamo bcrypt per fare un hashing della password





//FUNZIONI AUSILIARIE

//questa funzione prende un luogo (un oggetto con i dati di un locale) e se ha un'immagine, aggiunge al campo immagine l'url pubblico dell'immagine salvata su supabase storage, così da poterla mostrare al client. Se il luogo non ha un'immagine, restituisce il luogo com'è.
const aggiungiUrl = (luogo) => {
    if (!luogo.immagine) return luogo; // se non c'è immagine, restituisce il luogo com'è
    //se c'è un'immagine, ottiene l'url pubblico da supabase storage e lo aggiunge al campo immagine del luogo, sovrascrivendo il nome del file con l'url pubblico. In questo modo il client può usare direttamente luogo.immagine come url per mostrare l'immagine del locale.
    const { data: urlData } = supabase.storage
        .from('foto')
        .getPublicUrl(luogo.immagine);
    return { 
        ...luogo, 
        immagine: urlData.publicUrl 
    };
};





//Funzione per geocodificare un indirizzo (usata in fase di inserimento nuovo luogo da parte del supplier)
/**
 * geocodifica(indirizzo)
 * Converte un indirizzo testuale in coordinate lat/lng usando Nominatim
 * (il geocoder open-source di OpenStreetMap). Gratuito e senza API key.
 *
 * Usato quando un Supplier registra o modifica il proprio locale:
 * le coordinate vengono salvate nel DB e usate per il filtro "vicino a me"
 * e per i marker sulla mappa Leaflet.
 *
 * Limitazioni di Nominatim:
 * - Max 1 richiesta/secondo (rate limit per IP)
 * - Richiede User-Agent identificativo per evitare blocchi
 * - Precisione variabile per indirizzi italiani specifici
 *
 * Se l'indirizzo non viene trovato, ritorna { lat: null, lng: null }:
 * il locale viene comunque salvato ma non apparirà sulla mappa.
 */
async function geocodifica(indirizzo) {

    //geocodifica l'indirizzo usando l'API di Nominatim (OpenStreetMap), che restituisce le coordinate lat e lng corrispondenti all'indirizzo. La funzione prende come parametro l'indirizzo da geocodificare, costruisce l'url della richiesta all'API di Nominatim, effettua la richiesta e restituisce un oggetto con lat e lng. Se l'indirizzo non viene trovato, restituisce lat e lng null.
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(indirizzo)}&limit=1`;
    
    // Nominatim richiede un User-Agent identificativo, altrimenti potrebbe rifiutare la richiesta o bloccare l'IP per abuso. Qui stiamo usando un User-Agent generico con il nome della nostra app e una mail di contatto.
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Aperetto/1.0 (noreply.aperetto@gmail.com)' }
    });
    //res.json() restituisce un array di risultati, anche se noi abbiamo messo limit=1 quindi ci aspettiamo al massimo un risultato. Se l'array è vuoto, significa che l'indirizzo non è stato trovato.
    const risultato = await res.json();
    
    if (!risultato || risultato.length === 0) return { lat: null, lng: null };
    
    return {
        lat: parseFloat(risultato[0].lat),
        lng: parseFloat(risultato[0].lon)
    };
}


// API SESSIONE

/**
 * GET /api/me
 * Endpoint "chi sono?": il client lo chiama all'avvio di ogni pagina
 * per sapere se l'utente è loggato e ottenere i suoi dati base.
 * Se la sessione esiste → 200 + dati utente.
 * Se non esiste → 401 Unauthorized (il client mostrerà "Accedi").
 *
 * Questo pattern (session check via API) evita di dover passare
 * dati utente nei cookie o in localStorage.
 */
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

//API LOCALI 


/**
 * GET /api/location
 * Restituisce tutti i locali con URL immagine già risolto.
 * Usato dalla homepage per popolare lista + marker mappa.
 */
app.get('/api/location', async (req, res) => {
    const { data, error } = await supabase
        .from('location')
        .select('*');
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    // aggiungo l'url dell'immagine
    res.json(data.map(aggiungiUrl));
});



/**
 * GET /api/location/:id
 * Restituisce i dettagli di un singolo locale.
 * maybeSingle() restituisce null (non errore) se non trovato:
 * gestione esplicita del 404 invece di crash silenzioso.
 */
app.get('/api/location/:id', async (req, res) => {
    const id = req.params.id;
    const { data, error } = await supabase
        .from('location')
        .select('*')
        .eq('id', id)//filtro per id
        .maybeSingle();    


    if (error) return res.status(500).json({ error: error.message });
    if (!data)  return res.status(404).json({ error: 'Luogo non trovato' });

    res.json(aggiungiUrl(data));
});

// Ottengo i luoghi vicini a una posizione (usata per la ricerca dei locali vicini a me)
app.get("/api/luoghi/vicini", (req, res) => {
    //ottengo lat e lng dalla query string
    const { lat, lng } = req.query;
    //ottengo i luoghi dal database 
    const risultati = location.map(l => {
        const dist = Math.sqrt(
            Math.pow(l.lat - lat, 2) +
            Math.pow(l.lng - lng, 2)
        );

        return { ...l, dist };
        //calcolo la distanza e li ordino in base alla distanza (i più vicini prima) e restituisco i risultati al client
    }).sort((a, b) => a.dist - b.dist);

    res.json(risultati);
});



// LOGIN CONSUMER

/**
 * POST /api/login
 * Flusso login Consumer:
 * 1. Estrae email e password dal body
 * 2. Cerca l'utente nel DB per email
 * 3. Confronta la password con l'hash usando bcrypt.compare
 *    (bcrypt.compare è resistente ai timing attack: impiega sempre
 *     lo stesso tempo indipendentemente da quanti caratteri coincidono)
 * 4. Se corretta: crea sessione e risponde con i dati utente
 * 5. Se errata: risponde 401
 */
app.post("/api/login", async (req,res) =>{
    // estraggo i dati dal body della richiesta (email e password)
    const {name, surname, email, password} = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    // effettuo una select sul database per cercare l'utente
    const { data: user, error } = await supabase
        .from('consumer')
        .select('*')
        .eq('email', email) // lo cerchiamo rispetto alla mail
        .single();// single() perché ci aspettiamo un solo risultato, se non c'è o ce ne sono più di uno, restituisce un errore

    if (!user || error) {
        // 401 -> utente non trovato o errore nella query
        return res.status(401).json({ error: "Utente non trovato" });
    }

    // a stringhe uguali corrispondono hash uguali
    // confronto la password inviata dal client con l'hash salvato nel database usando bcrypt.compare, che restituisce true se 
    // la password corrisponde all'hash, false altrimenti. 
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

    if(isPasswordCorrect){
        
        // faccio partire una sessione e anche qui salvo i dati utente di base
        req.session.user = { 
            email: user.email,
            name: user.name,
            surname: user.surname
        };
        // ritorno un messaggio di successo e i dati dell'utente (non è necessario restituire i dati dell'utente, ma può essere 
        // comodo per il client averli subito dopo il login)
        res.json({ message: "Login effettuato!", user: req.session.user});
    } else {
        res.status(401).json({ error: "Password errata" });
    }
})



// REGISTRAZIONE CONSUMER

/**
 * POST /api/register
 * Flusso registrazione Consumer:
 * 1. Valida i campi (email, password obbligatori; min 8 char)
 * 2. Hash della password con bcrypt
 * 3. INSERT nel DB — se email duplicata (codice PostgreSQL '23505'),
 *    risponde con errore specifico invece di errore generico
 * 4. Avvia sessione automaticamente (l'utente è loggato subito dopo la registrazione)
 */
app.post("/api/register", async (req, res) =>{
    // estraggo i dati dal body della richiesta (name, surname, email e password)
    const {name, surname, email, password} = req.body;  

    // verifico la presenza dei campi principali: se non ci sono email e password non posso procedere
    if (!email || !password) {
        return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    // rifaccio il controllo sulla password (questo è un controllo forte, il server non è alterabile)
    if (password.length < 8) {
        return res.status(400).json({ error: "La password deve avere almeno 8 caratteri" });
    }

    try {
        // faccio un hashing della password usando bcrypt.hash
        //  ->  che restituisce una stringa hash che rappresenta la password in modo sicuro. Il secondo parametro saltRounds 
        //      indica il numero di iterazioni di hashing, più è alto più è sicuro ma più è lento (10 è un buon compromesso).
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        // inserisco l'utente nel database usando supabase, con i dati inviati dal client e l'hash della password. Se 
        // l'inserimento ha successo, data conterrà i dati dell'utente appena creato, altrimenti error conterrà l'errore.
        const { data, error } = await supabase
            .from('consumer')
            .insert([
                { 
                    name: name,
                    surname: surname,
                    email: email, 
                    password_hash: hash,
                }
            ])
            .select();

        // quando il vincolo di chiave sulla mail è stato violato, allora postrgre restituisce il codice di errore 23505
        if (error) {
            if (error.code === '23505') { //se la mail è in uso, notifico l'utente con un codice 400
                return res.status(400).json({ error: "Questa email è già registrata" });
            }
            throw error;
        }

        // INIZIO SESSIONE
        // faccio partire una nuova sessione e riempio il campo "sess" con i dati utente di base
        // da questo momento l'utente risulta loggato
        req.session.user = { 
            email: data[0].email,
            name: data[0].name,
            surname: data[0].surname
        };

        res.status(201).json({ 
            message: "Utente creato con successo!",
            user: req.session.user //mandiamo i dati all'utente
        });

    } catch (err) {
        console.error("Errore registrazione:", err.message, err.stack);
        res.status(500).json({ error: "Errore interno del server" });
    }
})


// LOGOUT CONSUMER
app.post('/api/logout', (req, res) => {
    // distrugge la sessione dell'utente, in questo modo quando il client farà una richiesta dopo il logout, non avrà più 
    // accesso ai dati della sessione e sarà considerato non loggato
    req.session.destroy();
    res.json({ message: 'Logout effettuato' });
});




// RECUPERO PASSWORD - CONSUMER
// creo una rotta POST /api/recover-password che riceve l'email dell'utente, verifica che esista un account 
// associato a quell'email, genera un token univoco e una scadenza, salva queste informazioni in una tabella password_resets, e invia 
// un'email all'utente con un link per reimpostare la password che contiene il token. Il client poi userà questo token per fare una 
// richiesta POST a /api/reset-password con la nuova password, e il server verificherà il token, aggiornerà la password dell'utente e 
// cancellerà il token usato.
const nodemailer = require('nodemailer');
//crypto è un modulo di node che fornisce funzioni crittografiche, in questo caso lo usiamo per generare un token casuale e univoco per il recupero password, che sarà difficile da indovinare o riprodurre.
const crypto = require('crypto');

// rotta per richiedere il recupero password, riceve l'email dell'utente
app.post('/api/recover-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json({ error: "Email obbligatoria" });
        // verifico associazione email - utente
        const { data: user, error } = await supabase
            .from('consumer')
            .select('*')
            .eq('email', email)
            .single();

        // nel caso in cui tale associazione non esiste genero un errore
        if (!user || error) {
            return res.status(404).json({ error: "Nessun account associato a questa email" });
        }
        // genero un token univoco, imposto una scadenza e lo salvo nel db
        const token = crypto.randomBytes(32).toString('hex');

        // imposto la scadenza del token a 5 minuti dopo la creazione, passato questo tempo il token non sarà più valido e l'utente
        // dovrà inviare una nuova richiesta
        const expiry = new Date(Date.now() + 300000).toISOString();

        // salvo il token, l'email e la scadenza nella tabella 'password_resets'
        // in questo modo posso poi verificare il token quando l'utente farà la richiesta di reset password
        const { data: insertData, error: insertError } = await supabase
            .from('password_resets')
            .insert([{ email, token, expiry }])
            .select();
        
        // se c'è un errore durante l'inserimento, restituisco un errore 500    
        if (insertError) {
            return res.status(500).json({ error: "Errore salvataggio token: " + insertError.message });
        }

        // INVIO MAIL
        // configuro "nodemailer" per inviare l'email di recupero password, in questo caso uso un account Gmail e una App Password 
        // (che è una password speciale generata da Google per consentire a un'app di accedere al tuo account senza usare la tua 
        // password normale, è più sicura perché puoi revocarla in qualsiasi momento e non espone la tua password reale).
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'noreply.aperetto@gmail.com',
                pass: 'tcez yues japg skee'
            }
        });

        // costruisco il link per il reset password che sarà inviato nell'email, includendo il token come parametro nella query string
        // il client poi userà questo token per fare la richiesta di reset password
        const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;

        // invio l'email all'utente con il link per reimpostare la password, usando il transporter configurato. L'email contiene un 
        // messaggio e un link cliccabile che porta alla pagina di reset password con il token
                await transporter.sendMail({
            from: 'noreply.aperetto@gmail.com',
            to: email,
            subject: 'Recupero password - Aperetto',
            html: `<p>Clicca il link per reimpostare la tua password:</p>
                   <a href="${resetLink}">${resetLink}</a>
                   <p>Il link scade tra 5 minuti.</p>`
        });

        res.json({ message: "Email inviata!" });

    } catch (err) {
        console.error("ERRORE RECOVER-PASSWORD:", err.message, err.stack);
        res.status(500).json({ error: "Errore interno: " + err.message });
    }
});

// RESET PASSWORD
// rotta per reimpostare la password, riceve il token e la nuova password, verifica che il token sia valido e non scaduto, aggiorna la 
// password dell'utente associato al token, cancella il token usato e restituisce un messaggio di successo. Se il token non è valido o 
// è scaduto, restituisce un errore.
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: "Dati mancanti" });
    }

    // faccio il solito controllo sulla lunghezza della password
    if (newPassword.length < 8) {
        return res.status(400).json({ error: "La password deve avere almeno 8 caratteri" });
    }

    // 1. Recupero il token dal db
    const { data: reset, error } = await supabase
        .from('password_resets')
        .select('*')
        .eq('token', token)
        .maybeSingle();

    if (!reset || error) {
        return res.status(400).json({ error: "Token non valido" });
    }

    // 2. Controllo scadenza
    // se il token è scaduto, allora l'user sarà costretto a inviare una nuova richiesta
    if (new Date() > new Date(reset.expiry)) {
        return res.status(400).json({ error: "Il link è scaduto" });
    }

    // 3. Hash della nuova password e aggiornamento utente
    const hash = await bcrypt.hash(newPassword, 10);
    // aggiorno la password dell'utente associato al token, usando l'email salvata nella tabella password_resets per identificare 
    // l'utente da aggiornare. Se c'è un errore durante l'aggiornamento, restituisco un errore 500.
    const { data: updateData, error: updateError } = await supabase
    .from('consumer')
    .update({ password_hash: hash })
    .eq('email', reset.email)
    .select(); 

    if (updateError) {
        return res.status(500).json({ error: "Errore nell'aggiornamento della password" });
    }

    // 4. Elimino il token usato (così non può essere riusato)
    await supabase.from('password_resets').delete().eq('token', token);

    res.json({ message: "Password aggiornata con successo!" });
});


// RECENSIONI LOCALE
app.get('/api/recensioni', async (req, res) => {
    //estraggo userId dalla query string (esempio /api/recensioni?userId=123)
    const { userId } = req.query;
    //faccio una query al database per ottenere tutte le recensioni dell'utente con quell'id, usando il filtro eq('user_id', userId).
    const { data, error } = await supabase
        .from('recensioni')
        .select('*, location(nome_locale)')
        .eq('user_id', userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 1. GET tutte le recensioni di un luogo (pubblica, senza login)
app.get('/api/recensioni/luogo/:id', async (req, res) => {
    const { id } = req.params;
    //faccio una query al database per ottenere tutte le recensioni del luogo con quell'id, usando il filtro eq('luogo_id', id). Se c'è un errore durante la query, restituisco un errore 500. Altrimenti restituisco i dati delle recensioni.
    const { data, error } = await supabase
        .from('recensioni')
        .select(`
            id,
            voto,
            testo,
            fornitura,
            fascia_oraria,
            created_at,
            consumer!recensioni_user_id_fkey ( name, surname )
        `)
        .eq('luogo_id', id)
        .order('created_at', { ascending: false });
 
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
 
 
// 2. POST crea una recensione (solo utenti loggati)
app.post('/api/recensioni', async (req, res) => {
 
    // blocca se non loggato
    if (!req.session.user) {
        return res.status(401).json({ error: 'Devi essere loggato per recensire' });
    }
 
    const { luogo_id, voto, fornitura, fascia_oraria, testo } = req.body;
    const user_id = req.session.user.email;
    // validazione base
    if (!luogo_id || !voto) {
        return res.status(400).json({ error: 'luogo_id e voto sono obbligatori' });
    }
    if (voto < 1 || voto > 5) {
        return res.status(400).json({ error: 'Il voto deve essere tra 1 e 5' });
    }
    // inserisco la recensione nel database, associandola al luogo_id e all'user_id (che prendo dalla sessione). Se c'è un errore durante l'inserimento, restituisco un errore 500. Se l'inserimento ha successo, restituisco i dati della recensione appena creata.
    const { data, error } = await supabase
        .from('recensioni')
        .insert([{ luogo_id, user_id, voto, testo: testo || '', fornitura: fornitura ?? null, fascia_oraria: fascia_oraria ?? null }])
        .select('id, voto, testo, fornitura, fascia_oraria, created_at, user_id')
        .single();
 
    if (error) {
        // codice 23505 = unique violato -> utente ha già recensito questo locale
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Hai già recensito questo locale' });
        }
        return res.status(500).json({ error: error.message });
    }
 
    res.status(201).json(data);
});
 


/**
 * GET /api/recensioni/mie
 * Restituisce le recensioni dell'utente loggato per la pagina profilo.
 * L'user_id viene preso dalla sessione server-side (non dal client):
 * questo impedisce che un utente richieda le recensioni di un altro
 * passando un id diverso nel body/query.
 * Usa JOIN implicito Supabase: `location:luogo_id (nome_locale)` aggiunge
 * il nome del locale senza necessità di query separate.
 */
app.get('/api/recensioni/mie', async (req, res) => {
 
    if (!req.session.user) {
        return res.status(401).json({ error: 'Non autorizzato' });
    }
    // prendo l'user_id dalla sessione, in questo caso user_id è la mail dell'utente loggato, che usiamo come identificatore univoco per le recensioni. In questo modo non è necessario inviare l'user_id dal client, che potrebbe essere manomesso, ma lo prendiamo direttamente dalla sessione del server, che è più sicura.
    const user_id = req.session.user.email;
    // faccio una query al database per ottenere tutte le recensioni dell'utente loggato, usando il filtro eq('user_id', user_id). Se c'è un errore durante la query, restituisco un errore 500. Altrimenti restituisco i dati delle recensioni, includendo anche il nome del locale associato a ogni recensione tramite la relazione con la tabella location.
    const { data, error } = await supabase
        .from('recensioni')
        .select(`
            luogo_id,
            voto,
            testo,
            created_at,
            fornitura,
            fascia_oraria,
            location:luogo_id ( nome_locale )
        `)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });
 
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});


// REGISTRAZIONE SUPPLIER
/**
 * POST /api/register-supplier  (multipart/form-data per via dell'immagine)
 * Registrazione Supplier: più complessa della Consumer perché include:
 * 1. Upload immagine locale → Supabase Storage
 *    Il nome file è "locali/timestamp_nomeoriginale" per evitare collisioni
 * 2. Hash password con bcrypt
 * 3. Geocodifica indirizzo → lat/lng (può fallire silenziosamente)
 * 4. INSERT nella tabella `location` (che contiene TUTTI i dati del locale)
 *
 * L'uso di upload.single('immagineLocale') da multer intercetta il file
 * prima che la rotta venga eseguita e lo rende disponibile in req.file.
 */
app.post('/api/register-supplier', upload.single('immagineLocale'), async (req, res) => {
    const {
        name, surname, email, password, ruolo,
        nomeLocale, indirizzoLocale, telefonoFinale, orarioApertura, orarioChiusura, aperitivo, colazione, giornoChiusura,
        sitoWeb, instagram
    } = req.body;

    if (!name || !surname || !email || !password || !ruolo || !nomeLocale || !indirizzoLocale || !orarioApertura || !orarioChiusura) {
        return res.status(400).json({ error: "Tutti i campi obbligatori devono essere compilati" });
    }

    try {
        //gestione upload immagine su supabase storage, se è stata inviata un'immagine. Il nome del file sarà "locali/timestamp_nomeoriginale", così da evitare conflitti di nomi e organizzare le immagini in una cartella dedicata. Se c'è un errore durante l'upload, viene restituito un errore 500.
        let nomeFile = null;
        if (req.file) {
            nomeFile = `locali/${Date.now()}_${req.file.originalname}`;
            const { error: uploadError } = await supabase.storage
                .from('foto')
                .upload(nomeFile, req.file.buffer, { contentType: req.file.mimetype });

            if (uploadError) throw uploadError;
        }
        //faccio un hashing della password usando bcrypt.hash, che restituisce una stringa hash che rappresenta la password in modo sicuro. Il secondo parametro saltRounds indica il numero di iterazioni di hashing, più è alto più è sicuro ma più è lento (10 è un buon compromesso).
        const saltRounds = 10;
        const hashSupplier = await bcrypt.hash(password, saltRounds);
        //geocodifico l'indirizzo del locale per ottenere lat e lng, che saranno salvati nel database e usati per la ricerca dei locali vicini. Se l'indirizzo non viene trovato, lat e lng saranno null.
        const { lat, lng } = await geocodifica(indirizzoLocale);
        //inserisco il nuovo luogo nel database usando supabase, con i dati inviati dal client, l'hash della password e le coordinate geografiche. Se l'inserimento ha successo, data conterrà i dati del luogo appena creato, altrimenti error conterrà l'errore.
        const { data, error } = await supabase
            .from('location')
            .insert([{
                email: email.toLowerCase().trim(),
                nome: name,
                cognome: surname,
                password_hash: hashSupplier,
                ruolo,
                nome_locale: nomeLocale,
                indirizzo: indirizzoLocale,
                telefono: telefonoFinale || null,
                apertura: orarioApertura,
                chiusura: orarioChiusura,
                giorno_chiusura: giornoChiusura || null,
                aperitivo: aperitivo === 'true' || aperitivo === true,
                colazione: colazione === 'true' || colazione === true,
                sito_web: sitoWeb || null,
                instagram: instagram || null,
                lat,
                lng,
                immagine: nomeFile
            }])
            .select('id');
            

        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: "Questo locale è già registrato" });
            throw error;
        }

        res.status(201).json({ message: "Registrazione completata con successo!", id: data[0].id });
        /* restituisco l'id del luogo appena creato per inserirlo nel redirect dopo la registrazione / login */

    } catch (err) {
        console.error("Errore registrazione supplier:", err.message, err.stack);
        res.status(500).json({ error: "Errore interno del server" });
    }
});

// LOGIN SUPPLIER
/**
 * POST /api/login-supplier
 * Login Supplier: uguale al Consumer ma cerca nella tabella `location`.
 * La sessione salva anche `localeId` (id del locale) oltre all'email:
 * questo campo viene usato nelle rotte protette (es. PUT /api/location/:id)
 * per verificare che il Supplier stia modificando solo il proprio locale.
 */
app.post("/api/login-supplier", async (req,res) =>{
    const {email, password} = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Tutti i campi sono obbligatori" });
    }

    //effettuo una select sul database per cercare l'utente
    const { data: user, error } = await supabase
        .from('location')
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
            email: user.email,
            localeId: user.id,
        };

        res.json({ message: "Login effettuato!", user: req.session.user, id: user.id});
    } else {
        res.status(401).json({ error: "Password errata" });
    }

})



//  MODIFICA INFORMAZIONI LOCALE - PROFILO SUPPLIER
//  nella pagina del profilo, viene data la possibilità di cambiare tutte le informazioni del locale
app.put('/api/location/:id', async (req, res) => {
 
    // 1. Controllo sessione: deve essere loggato come supplier
    if (!req.session.user || !req.session.user.localeId) {
        return res.status(401).json({ error: 'Non autorizzato' });
    }
 
    const id = req.params.id;
 
    // 2. Il supplier può aggiornare solo il proprio locale
    if (req.session.user.localeId !== id) {
        return res.status(403).json({ error: 'Non puoi modificare questo locale' });
    }
 
    // 3. Whitelist dei campi aggiornabili
    //    (nessun campo sensibile come email, password_hash, ruolo, lat, lng)
    const CAMPI_CONSENTITI = [
        'nome_locale',
        'tipologia',
        'descrizione',
        'indirizzo',
        'telefono',
        'sito_web',
        'instagram',
        'apertura',
        'chiusura',
        'giorno_chiusura',
        'immagine',
        'aperitivo',
        'colazione',
    ];
 
    // 4. Costruisco l'oggetto con solo i campi consentiti presenti nel body
    const aggiornamenti = {};
    for (const campo of CAMPI_CONSENTITI) {
        if (req.body[campo] !== undefined) {
            aggiornamenti[campo] = req.body[campo];
        }
    }
 
    // 5. Validazione base
    //    controllo che nel body siano presenti almeno 'nome_locale', 'indirizzo', 'apertura' e 'chisura' e che almeno uno tra 'aperitivo' e 'colazione' sia spuntato
        if (!aggiornamenti.nome_locale || !aggiornamenti.indirizzo || !aggiornamenti.apertura || !aggiornamenti.chiusura 
            || (!aggiornamenti.aperitivo && !aggiornamenti.colazione)) {
        return res.status(400).json({ error: 'Inserire i campi obbligatori' });
    }
 
    // 6. Se l'indirizzo è cambiato, ricalcolo le coordinate geografiche
    //    così la mappa rimane aggiornata senza intervento manuale
    try {
        const { data: localeAttuale, error: fetchError } = await supabase
            .from('location')
            .select('indirizzo')
            .eq('id', id)
            .single();
 
        if (fetchError) throw fetchError;
 
        if (
            localeAttuale &&
            aggiornamenti.indirizzo &&
            aggiornamenti.indirizzo !== localeAttuale.indirizzo
        ) {
            const { lat, lng } = await geocodifica(aggiornamenti.indirizzo);
            aggiornamenti.lat = lat;
            aggiornamenti.lng = lng;
        }
    } catch (err) {
        // se la geocodifica fallisce non blocco il salvataggio, loggo solo
        console.warn('Geocodifica fallita durante aggiornamento:', err.message);
    }
 
    // 7. Eseguo l'UPDATE su Supabase
    try {
        const { data, error } = await supabase
            .from('location')
            .update(aggiornamenti)
            .eq('id', id)
            .select()
            .single();
 
        if (error) throw error;
 
        res.json({ message: 'Locale aggiornato con successo', locale: aggiungiUrl(data) });
 
    } catch (err) {
        console.error('Errore aggiornamento locale:', err.message);
        res.status(500).json({ error: err.message || 'Errore interno del server' });
    }
});


// RECUPERO PASSWORD SUPPLIER
app.post('/api/recover-password-supplier', async (req, res) => {
    try {
        // estraggo l'email dal body della richiesta, la normalizzo (rimuovendo spazi e convertendo in minuscolo) per evitare problemi di formattazione 
        // o differenze di maiuscole/minuscole che potrebbero impedire di trovare l'account associato all'email. Se l'email è mancante, restituisco un errore 400.
        const email = req.body.email?.trim().toLowerCase();

        if (!email) return res.status(400).json({ error: "Email obbligatoria" });
        // Controllo associazion email - account
        const { data: user, error } = await supabase
            .from('location')
            .select('*')
            .eq('email', email)
            .single();

        if (!user || error) {
            return res.status(404).json({ error: "Nessun account associato a questa email" });
        }
        // Generazione token univoco + scadenza e salvataggio nel db
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 300000).toISOString();//+5 minuti

        const { data: insertData, error: insertError } = await supabase
            .from('password_resets')
            .insert([{ email, token, expiry }])
            .select();

        if (insertError) {
            return res.status(500).json({ error: "Errore salvataggio token: " + insertError.message });
        }
        //invio mail
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'noreply.aperetto@gmail.com',
                pass: 'tcez yues japg skee'// usa una App Password di Google, non la password normale
            }
        });

        const resetLink = `http://localhost:3000/reset-password-supplier.html?token=${token}`;

        await transporter.sendMail({
            from: 'noreply.aperetto@gmail.com',
            to: email,
            subject: 'Recupero password - Aperetto',
            html: `<p>Clicca il link per reimpostare la tua password:</p>
                   <a href="${resetLink}">${resetLink}</a>
                   <p>Il link scade tra 5 minuti.</p>`
        });

        res.json({ message: "Email inviata!" });

    } catch (err) {
        console.error("ERRORE RECOVER-PASSWORD:", err.message, err.stack);
        res.status(500).json({ error: "Errore interno: " + err.message });
    }
});
//  RESET PASSWORD SUPPLIER
//  rotta per reimpostare la password del supplier, simile a quella del client ma aggiorna la tabella location invece di consumer
app.post('/api/reset-password-supplier', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: "Dati mancanti" });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({ error: "La password deve avere almeno 8 caratteri" });
    }

    // 1. Recupero il token dal db
    const { data: reset, error } = await supabase
        .from('password_resets')
        .select('*')
        .eq('token', token)
        .maybeSingle();

    if (!reset || error) {
        return res.status(400).json({ error: "Token non valido" });
    }

    // 2. Controllo scadenza
    if (new Date() > new Date(reset.expiry)) {
        return res.status(400).json({ error: "Il link è scaduto" });
    }

    // 3. Hash della nuova password e aggiornamento utente
    //aggiorno la password dell'utente associato al token, usando l'email salvata nella tabella password_resets per identificare l'utente da aggiornare. Se c'è un errore durante l'aggiornamento, restituisco un errore 500.
    const hash = await bcrypt.hash(newPassword, 10);
    const { data: updateData, error: updateError } = await supabase
    .from('location')
    .update({ password_hash: hash })
    .eq('email', reset.email)
    .select();

    if (updateError) {
        return res.status(500).json({ error: "Errore nell'aggiornamento della password" });
    }

    // 4. Elimino il token usato (così non può essere riusato)
    await supabase.from('password_resets').delete().eq('token', token);

    res.json({ message: "Password aggiornata con successo!" });
});

// AVVIO SERVER
app.listen(PORT,HOST,()=>{
    console.log(`Server in ascolto su http://localhost:${PORT}`);
});