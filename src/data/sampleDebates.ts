import { DebateSegment, SpeakerProfile } from "../types";

export interface SampleDebate {
  id: string;
  title: string;
  topic: string;
  speakers: Record<string, SpeakerProfile>;
  turns: { speakerId: string; text: string; delayMs: number }[];
}

export const SAMPLE_DEBATES: SampleDebate[] = [
  {
    id: "free-will",
    title: "Determinism versus Free Will",
    topic: "Are humans completely governed by physical laws and prior states (Determinism), or do we possess genuine libertarian free will and moral agency?",
    speakers: {
      sig_alpha: {
        id: "sig_alpha",
        label: "Person A (Determinist)",
        avatarColor: "#e11d48", // Rose 600
        wordCount: 165,
        segmentsCount: 3,
        personalitySummary: "Highly analytical and empirically driven. Argues from a strictly physicalist worldview, rejecting moral magic in favor of neurochemical causality.",
        strengths: ["Rigorous empirical logic", "Avoids emotional appeals", "Consistent framework"],
        weaknesses: ["Fails to address human moral experience", "Over-reliant on mechanical metaphors", "Slightly dismissive of agency"],
        averageCorrectnessRating: 88,
        averageComplexity: 75,
        mostUsedKeywords: ["Causality", "Neuroscience", "Spinoza", "Pre-determined"],
        debateStyle: "Rigorous Empiricist",
        conclusion: "Maintains a highly logical and consistent physicalist argument, although fails to offer a satisfying compatibilist answer to human moral experience.",
      },
      sig_beta: {
        id: "sig_beta",
        label: "Person B (Libertarian)",
        avatarColor: "#2563eb", // Blue 600
        wordCount: 154,
        segmentsCount: 3,
        personalitySummary: "Expressive and passionate. Believes deeply in the raw phenomenological experience of agency and moral accountability, but occasionally drifts into rhetorical sophistry.",
        strengths: ["Strong emotional resonance", "Focuses on moral accountability", "Elaborate metaphors"],
        weaknesses: ["Circulus in probando (begging the question)", "Relies heavily on subjective intuition", "Struggles with physical physics laws"],
        averageCorrectnessRating: 58,
        averageComplexity: 85,
        mostUsedKeywords: ["Agency", "Phenomenology", "Existential Choice", "Kant"],
        debateStyle: "Rhetorical Firebrand",
        conclusion: "A highly engaging orator who defends moral responsibility with sophisticated terminology, but suffers from severe logical leaps when confronted with material causality.",
      },
      sig_gamma: {
        id: "sig_gamma",
        label: "Person C (Compatibilist)",
        avatarColor: "#16a34a", // Green 600
        wordCount: 142,
        segmentsCount: 3,
        personalitySummary: "Calm, intellectual mediator. Seeks to redefine 'free will' not as a magical physical bypass, but as a cognitive capability to act in accordance with internal desires without external coercion.",
        strengths: ["Excellent conceptual clarity", "Saves moral agency without defying physics", "Highly pragmatic"],
        weaknesses: ["Redefines terms rather than solving the conflict", "Frustrates hardline opponents", "Verbose explanations"],
        averageCorrectnessRating: 92,
        averageComplexity: 90,
        mostUsedKeywords: ["Compatibilism", "Agency Level", "Daniel Dennett", "Autonomy"],
        debateStyle: "Socratic Moderator",
        conclusion: "Synthesized the debate beautifully, demonstrating that moral accountability and causality can coexist. Spoke with high vocabulary and excellent precision.",
      }
    },
    turns: [
      {
        speakerId: "sig_alpha",
        text: "The universe is fundamentally governed by deterministic physical laws. Every neurochemical cascade in our brains, every action potential that initiates a choice, is completely determined by the prior physical state of the universe and the laws of physics. To claim humans have 'free will' is to claim a magical exemption from causality.",
        delayMs: 3000
      },
      {
        speakerId: "sig_beta",
        text: "But that physicalist reductionism completely destroys the very foundation of human ethics and moral responsibility! If my decisions are merely the inevitable output of atomic collisions from the Big Bang, then praise, blame, justice, and existential choice are completely meaningless illusions! We must accept the phenomenology of our own agency. I feel the weight of choice; therefore, I choose.",
        delayMs: 4000
      },
      {
        speakerId: "sig_gamma",
        text: "Let us be precise. You are both locked in a false dichotomy. Determinism is true, but that does not negate agency. Free will should not be defined as 'uncaused magic'. Rather, free will is the cognitive capacity to act in accordance with one's desires and rational deliberation, free from external coercion. We are determined to have agency, and that is compatibilism.",
        delayMs: 4000
      },
      {
        speakerId: "sig_alpha",
        text: "That compatibilist move is simply a semantic trick, what Immanuel Kant famously called a 'wretched subterfuge'! You are merely redefining 'freedom' to mean being pulled by a thread that we happen to agree with. If the desire itself is 100% determined by genetic legacy and environmental triggers, you are still a mechanical automaton, just a happy one.",
        delayMs: 3000
      },
      {
        speakerId: "sig_beta",
        text: "Exactly, A! Compatibilism is intellectual cowardice. It is solipsistic wordplay that attempts to avoid the absolute dread of existential freedom. To say we are free while bound by chemical chains is nonsense. We must assert that consciousness is an emergent phenomenon that has genuine top-down causal power. The mind commands the brain!",
        delayMs: 4000
      },
      {
        speakerId: "sig_gamma",
        text: "Claiming top-down uncaused agency defies everything we know about neuroscience and thermodynamics. If the mind changes the physical state of the brain without physical inputs, you are violating the conservation of energy. We must recognize that freedom is a high-level system property, much like 'liquidity' is a property of water, not individual atoms.",
        delayMs: 4000
      }
    ]
  },
  {
    id: "simulation",
    title: "The Simulation Hypothesis & Reality",
    topic: "Are we living in a computer simulation designed by a post-human civilization, and what are the ontological implications?",
    speakers: {
      sig_alpha: {
        id: "sig_alpha",
        label: "Person A (Sim-Proponent)",
        avatarColor: "#e11d48",
        wordCount: 140,
        segmentsCount: 3,
        personalitySummary: "Enthusiastic transhumanist. Convinced by statistical probability and computer science growth, though prone to speculative leaps.",
        strengths: ["Strong grasp of technology trend lines", "Understands statistical probability", "Clear analogies"],
        weaknesses: ["Unverifiable assumptions", "Glossy sci-fi handwaving", "Dismisses the hard problem of consciousness"],
        averageCorrectnessRating: 70,
        averageComplexity: 78,
        mostUsedKeywords: ["Bostrom", "Computation", "Probability", "Ancestry simulation"],
        debateStyle: "Speculative Tech-Futurist",
        conclusion: "Defended Nick Bostrom's trilemma with vigor, but struggled to ground the claims in testable physical reality.",
      },
      sig_beta: {
        id: "sig_beta",
        label: "Person B (Physicalist Realist)",
        avatarColor: "#2563eb",
        wordCount: 150,
        segmentsCount: 3,
        personalitySummary: "Grounded, no-nonsense empiricist. Rejects post-human digital mysticism in favor of Occam's razor.",
        strengths: ["Skeptical hygiene", "Applies Occam's Razor", "Addresses physical constraints"],
        weaknesses: ["A bit stubborn", "Underestimates exponential growth", "Occasionally dogmatic"],
        averageCorrectnessRating: 90,
        averageComplexity: 70,
        mostUsedKeywords: ["Occam's razor", "Empirical evidence", "Materiality", "Mysticism"],
        debateStyle: "Dogged Realist",
        conclusion: "Effectively dismantled the statistical leap of the simulation hypothesis by pointing out that simulated minds may not even be physically conscious.",
      }
    },
    turns: [
      {
        speakerId: "sig_alpha",
        text: "Think about our own progress. In just forty years, we went from Pong to highly detailed 3D rendering. In another thousand years, computing power will be trillions of times greater. If a post-human civilization reaches this point, they will run millions of historical simulations. Statistically, there are far more simulated minds than real ones. Therefore, we are almost certainly simulated.",
        delayMs: 3500
      },
      {
        speakerId: "sig_beta",
        text: "That Bostrom trilemma makes a massive, unproven leap: that consciousness is substrate-independent! You assume a silicon microchip can support subjective qualitative experience—the red of a rose, the feeling of pain. But consciousness might require biological complexity that cannot be simulated. Without proof, this is just a sci-fi religion for technologists.",
        delayMs: 4000
      },
      {
        speakerId: "sig_alpha",
        text: "Consciousness is fundamentally information processing. If you map every neuron and synapse in a human brain and run it on a silicon grid with exact inputs, the system will process the data identically. To say biology has a magical soul-like monopoly on awareness is carbon-chauvinism! Information is physical, and computation can run it.",
        delayMs: 3500
      },
      {
        speakerId: "sig_beta",
        text: "It is not carbon-chauvinism, it is scientific humility! You are ignoring Occam's Razor. You are multiplying entities beyond necessity. To explain our universe, you invoke an unobservable super-universe, running unobservable super-computers, built by unobservable post-humans. Why not just accept the physical reality we actually observe? It is far more parsimonious.",
        delayMs: 4000
      }
    ]
  }
];
