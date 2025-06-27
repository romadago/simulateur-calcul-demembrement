import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// --- Configuration du barème fiscal (Article 669 du CGI) ---
const BAREME_669 = [
  { ageMax: 20, usufruit: 90 },
  { ageMax: 30, usufruit: 80 },
  { ageMax: 40, usufruit: 70 },
  { ageMax: 50, usufruit: 60 },
  { ageMax: 60, usufruit: 50 },
  { ageMax: 70, usufruit: 40 },
  { ageMax: 80, usufruit: 30 },
  { ageMax: 90, usufruit: 20 },
  { ageMax: Infinity, usufruit: 10 },
];

const COLORS = ['#00FFD2', '#4f46e5']; // Turquoise pour la Nue-Propriété, Indigo pour l'Usufruit

// --- Helper Components ---
interface InputSliderProps {
  label: string;
  unit: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}

const InputSlider: React.FC<InputSliderProps> = ({ label, unit, value, onChange, ...props }) => (
  <div>
    <label className="text-gray-300 text-sm font-medium mb-2 block">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-bold text-white">{value.toLocaleString('fr-FR')} {unit}</span>
      </div>
    </label>
    <input
      type="range" {...props} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
    />
  </div>
);

// --- Composant principal ---
const App: React.FC = () => {
  // --- États ---
  const [valeurActif, setValeurActif] = useState<number>(200000);
  const [ageUsufruitier, setAgeUsufruitier] = useState<number>(65);
  const [repartition, setRepartition] = useState({ nuePropriete: 0, usufruit: 0, nueProprieteEuros: 0, usufruitEuros: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');

  // --- Moteur de calcul ---
  useEffect(() => {
    const tranche = BAREME_669.find(t => ageUsufruitier <= t.ageMax);
    const valeurUsufruitPct = tranche ? tranche.usufruit : 0;
    const valeurNueProprietePct = 100 - valeurUsufruitPct;

    const valeurNueProprieteEuros = valeurActif * (valeurNueProprietePct / 100);
    const valeurUsufruitEuros = valeurActif * (valeurUsufruitPct / 100);

    setRepartition({
      nuePropriete: valeurNueProprietePct,
      usufruit: valeurUsufruitPct,
      nueProprieteEuros: valeurNueProprieteEuros,
      usufruitEuros: valeurUsufruitEuros,
    });
    
    setChartData([
        { name: 'Nue-Propriété', value: valeurNueProprieteEuros },
        { name: 'Usufruit', value: valeurUsufruitEuros }
    ]);

  }, [ageUsufruitier, valeurActif]);
  
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        setEmailMessage('Veuillez saisir une adresse e-mail valide.');
        return;
    }
    setIsSending(true);
    setEmailMessage('');
    
    const simulationData = {
        objectifs: {
            valeurActif: `${valeurActif.toLocaleString('fr-FR')} €`,
            ageUsufruitier: `${ageUsufruitier} ans`,
        },
        resultats: {
            valeurNuePropriete: `${repartition.nueProprieteEuros.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR'})} (${repartition.nuePropriete}%)`,
            valeurUsufruit: `${repartition.usufruitEuros.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR'})} (${repartition.usufruit}%)`,
        }
    };

    try {
        const response = await fetch('/.netlify/functions/send-simulation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, data: simulationData, theme: 'Calcul Démembrement' }),
        });

        if (!response.ok) { throw new Error("Erreur lors de l'envoi."); }

        setEmailMessage(`Votre simulation a bien été envoyée à ${email}.`);
        setEmail('');

    } catch (error) {
        console.error('Failed to send simulation:', error);
        setEmailMessage("Une erreur est survenue. Veuillez réessayer.");
    } finally {
        setIsSending(false);
        setTimeout(() => setEmailMessage(''), 5000);
    }
  };


  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-700 p-4 sm:p-8 font-sans flex items-center justify-center min-h-screen">
      <div className="bg-slate-800/50 backdrop-blur-sm ring-1 ring-white/10 p-6 sm:p-10 rounded-2xl shadow-2xl w-full max-w-5xl mx-auto">
        
        <div className="text-center mb-10">
            <img src="/generique-turquoise.svg" alt="Logo Aeternia Patrimoine" className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">
                Calcul de Démembrement de Propriété
            </h1>
            <p className="text-slate-300 mt-2">Répartition de la valeur selon l'âge de l'usufruitier (Art. 669 CGI).</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Colonne de Gauche : Contrôles */}
            <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10 flex flex-col justify-between h-full">
                 <h2 className="text-2xl font-semibold text-[#00FFD2] mb-6 text-center">Vos Paramètres</h2>
                 <div className="space-y-8">
                     <InputSlider
                        label="Valeur totale de l'actif" unit="€"
                        value={valeurActif} onChange={setValeurActif}
                        min={10000} max={2000000} step={10000}
                     />
                     <div>
                        <label className="text-gray-300 text-sm font-medium mb-2 block">
                            <div className="flex items-center justify-between">
                                <span>Âge de l'usufruitier</span>
                                <span className="font-bold text-2xl text-white">{ageUsufruitier} ans</span>
                            </div>
                        </label>
                        <input
                          type="range" min={18} max={100} step={1} value={ageUsufruitier}
                          onChange={(e) => setAgeUsufruitier(parseInt(e.target.value, 10))}
                          className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                 </div>
                 <div className="mt-8 text-center">
                    <div className="bg-[#00FFD2]/10 border border-[#00FFD2] p-4 rounded-lg mb-4">
                        <p className="text-sm font-semibold text-[#00FFD2]">Valeur de la Nue-Propriété</p>
                        <p className="text-3xl font-extrabold text-white mt-1">{repartition.nueProprieteEuros.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</p>
                    </div>
                    <div className="bg-indigo-500/10 border border-indigo-400 p-4 rounded-lg">
                        <p className="text-sm font-semibold text-indigo-300">Valeur de l'Usufruit</p>
                        <p className="text-3xl font-extrabold text-white mt-1">{repartition.usufruitEuros.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0})}</p>
                    </div>
                 </div>
            </div>

            {/* Colonne de Droite : Graphique et CTAs */}
            <div className="bg-slate-700/50 p-6 rounded-lg shadow-inner ring-1 ring-white/10">
                 <h2 className="text-2xl font-semibold text-[#00FFD2] mb-6 text-center">Répartition de la valeur</h2>
                 <div className="w-full h-52">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5}>
                                {chartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number, name: string) => [`${value.toLocaleString('fr-FR')} €`, name]}
                                contentStyle={{ backgroundColor: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '0.5rem' }}
                            />
                            <Legend wrapperStyle={{ color: '#e2e8f0', paddingTop: '15px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="mt-8 pt-6 border-t border-slate-600">
                     <h3 className="text-lg font-semibold text-gray-100 mb-4 text-center">Intéressé(e) par le démembrement ?</h3>
                     <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2 mb-4 max-w-lg mx-auto">
                        <input
                            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder="Votre adresse e-mail"
                            className="flex-grow bg-slate-800 text-white placeholder-slate-400 border border-slate-600 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#00FFD2]"
                            required disabled={isSending}
                        />
                        <button type="submit" className="bg-slate-600 text-white font-bold py-3 px-5 rounded-lg hover:bg-slate-500 transition-colors duration-300 disabled:opacity-50" disabled={isSending}>
                            {isSending ? 'Envoi...' : 'Recevoir'}
                        </button>
                    </form>
                    {emailMessage && <p className="text-sm text-center text-emerald-400 mb-4">{emailMessage}</p>}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                        <a href="https://www.aeterniapatrimoine.fr/solutions/" target="_blank" rel="noopener noreferrer" className="bg-[#00FFD2] text-slate-900 font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-white transition-colors duration-300 w-full sm:w-auto">
                            Découvrir nos solutions
                        </a>
                        <a href="https://www.aeterniapatrimoine.fr/contact/" target="_blank" rel="noopener noreferrer" className="bg-transparent border-2 border-[#00FFD2] text-[#00FFD2] font-bold py-3 px-8 rounded-lg hover:bg-[#00FFD2] hover:text-slate-900 transition-colors duration-300 w-full sm:w-auto">
                            Prendre rendez-vous
                        </a>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Disclaimer Section */}
        <div className="text-center mt-10">
             <div className="text-xs text-slate-400 p-4 bg-slate-900/50 rounded-lg max-w-3xl mx-auto.">
                <h3 className="font-semibold text-slate-300 mb-2">Avertissement</h3>
                <p>Ce simulateur fournit une estimation basée sur le barème fiscal de l'article 669 du CGI. Les résultats sont donnés à titre indicatif et non contractuel. Pour une analyse personnalisée de votre situation, consultez un de nos conseillers.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;
