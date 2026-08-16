# SignalLab ECE 210 Terminology Reference & Standard

This document establishes the official mathematical terminology standard for **SignalLab**, derived directly from the UIUC ECE 210 textbook (_Analog Signals and Systems_ by Erhan Kudeki and David C. Munson Jr.) and standard lecture conventions.

All interactive components, practice card headers, step breakdown walkthroughs, variable labels, and documentation MUST strictly follow these terminology standards.

---

## 1. Differential Equations & System Responses (Chapters 3, 10, & 11)

| Standard Term                 | Symbol / Form                            | Discouraged / Non-Standard Terms         | Rationale & Context (Kudeki & Munson)                                                                                                                                      |
| :---------------------------- | :--------------------------------------- | :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Total Response**            | $y(t) = y_h(t) + y_p(t)$                 | Complete response, Full solution         | Combination of the homogeneous solution $y_h(t)$ and particular solution $y_p(t)$, or zero-input $y_{\text{ZI}}(t)$ and zero-state $y_{\text{ZS}}(t)$ (Sections 3.3, 3.4). |
| **Homogeneous Solution**      | $y_h(t)$                                 | Natural response, Complementary solution | Unforced solution satisfying the homogeneous form of the ODE $P(s) = 0$ (Section 3.4).                                                                                     |
| **Particular Solution**       | $y_p(t)$                                 | Forced response, Particular response     | Trial ansatz solution matching the forcing input function $f(t)$ (Section 3.4, Table 3.1).                                                                                 |
| **Zero-Input Response**       | $y_{\text{ZI}}(t)$                       | Free response                            | Response due _solely_ to initial state / initial conditions ($y(0^-), y'(0^-)$) with $f(t)=0$ (Section 3.3).                                                               |
| **Zero-State Response**       | $y_{\text{ZS}}(t)$                       | Forced response                          | Response due _solely_ to system input $f(t)$ with zero initial conditions ($y(0^-)=0, y'(0^-)=0$) (Section 3.3).                                                           |
| **Characteristic Polynomial** | $P(s) = s^n + a_1 s^{n-1} + \dots + a_n$ | System polynomial                        | Denominator polynomial of the transfer function $\hat{H}(s) = \frac{B(s)}{P(s)}$ (Section 11.4).                                                                           |
| **Characteristic Poles**      | $p_1, p_2, \dots, p_n$                   | System roots, Eigenvalues                | Roots of the characteristic polynomial $P(s) = 0$ (Section 11.4.1).                                                                                                        |
| **Characteristic Modes**      | $c_k(t) = t^k e^{p_i t}$                 | Natural modes                            | Exponential and modal terms composing the zero-input response (Section 11.4.1).                                                                                            |
| **LTIC System**               | LTIC                                     | Causal LTI system                        | Linear Time-Invariant **Causal** System ($h(t) = 0$ for $t < 0$) (Section 10.3).                                                                                           |

---

## 2. Circuit Fundamentals & Phasors (Chapters 1 & 4)

| Standard Term                       | Symbol / Form                        | Discouraged / Non-Standard Terms | Rationale & Context                                                                                                                               |
| :---------------------------------- | :----------------------------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Co-sinusoid** / **Co-sinusoidal** | $\cos(\omega t + \theta)$            | Pure sinusoid, Cosine wave       | Textbook explicitly uses "co-sinusoid" for $\cos(\omega t + \theta)$ to distinguish standard phasor references from sine functions (Section 4.1). |
| **Absorbed Power**                  | $p = v \cdot i$                      | Power dissipation                | Standardized passive sign convention for energy loss ($p > 0$) or injection ($p < 0$) (Section 1.1, Table 1.1).                                   |
| **Average Power**                   | $P = \frac{1}{2} \text{Re}\{V I^*\}$ | Real power, Active power         | Net power absorbed by a circuit element over one oscillation period (Section 4.3).                                                                |
| **Impedance**                       | $Z = R + jX$                         | AC resistance                    | Ratio of voltage phasor to current phasor $Z = \frac{V}{I}$ in ohms (Section 4.1.3).                                                              |
| **Reactance**                       | $X = \text{Im}\{Z\}$                 | Imaginary resistance             | Imaginary part of impedance: $\omega L$ for inductors, $-\frac{1}{\omega C}$ for capacitors (Section 4.1.3).                                      |

---

## 3. Fourier Series (Chapter 6)

| Standard Term                    | Symbol / Form                                                                         | Discouraged / Non-Standard Terms | Rationale & Context                                                                              |
| :------------------------------- | :------------------------------------------------------------------------------------ | :------------------------------- | :----------------------------------------------------------------------------------------------- |
| **Exponential Fourier Series**   | $f(t) = \sum_{n=-\infty}^{\infty} F_n e^{j n \omega_0 t}$                             | Complex Fourier series           | Standard complex exponential series representation with coefficients $F_n$ (Table 6.1).          |
| **Trigonometric Fourier Series** | $\frac{a_0}{2} + \sum_{n=1}^{\infty} [a_n \cos(n\omega_0 t) + b_n \sin(n\omega_0 t)]$ | Real Fourier series              | Sine-cosine form with coefficients $a_n = F_n + F_{-n}$ and $b_n = j(F_n - F_{-n})$ (Table 6.1). |
| **Compact Fourier Series**       | $\frac{c_0}{2} + \sum_{n=1}^{\infty} c_n \cos(n\omega_0 t + \theta_n)$                | Polar Fourier series             | Magnitude-phase form for real-valued $f(t)$ with $c_n = 2                                        | F_n                            | $ and $\theta_n = \angle F_n$ (Table 6.1). |
| **Fundamental Frequency**        | $\omega_0 = \frac{2\pi}{T}$                                                           | Base frequency                   | Radiating frequency of the fundamental harmonic in rad/s (Section 6.1).                          |
| **Harmonic Frequency**           | $n \omega_0$                                                                          | Overtone                         | The $n$-th integer multiple of fundamental frequency $\omega_0$ (Section 6.1).                   |
| **DC Component**                 | $F_0 = \frac{a_0}{2} = \frac{c_0}{2}$                                                 | Offset, Average value            | Average value of the periodic signal over one period $T$ (Section 6.1).                          |
| **Zero-Mean Signal**             | Zero-mean                                                                             | DC-free                          | A periodic signal with $F_0 = 0$ (Section 6.1).                                                  |
| **Power Spectrum**               | $                                                                                     | F_n                              | ^2$                                                                                              | Energy spectrum (for periodic) | Plot of $                                  | F_n              | ^2$ versus harmonic frequency $n\omega_0$ (Section 6.3.2).                     |
| **Total Harmonic Distortion**    | $\text{THD} = \frac{\sum_{n=2}^{\infty}                                               | F_n                              | ^2}{                                                                                             | F_1                            | ^2}$                                       | Distortion ratio | Ratio of total power in higher harmonics to fundamental power (Section 6.3.3). |

---

## 4. Fourier Transform & Energy Signals (Chapters 7 & 9)

| Standard Term              | Symbol / Form                        | Discouraged / Non-Standard Terms | Rationale & Context                                                                                              |
| :------------------------- | :----------------------------------- | :------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| **Fourier Transform Pair** | $f(t) \leftrightarrow F(\omega)$     | Transform duality                | Unique pairing between continuous time domain and frequency domain (Section 7.1).                                |
| **Energy Signal**          | Energy signal                        | Finite signal                    | Signal with finite total energy $W = \int_{-\infty}^{\infty}                                                     | f(t)                   | ^2 dt < \infty$ (Section 7.2).                                        |
| **Power Signal**           | Power signal                         | Infinite energy signal           | Signal with infinite energy but finite average power (Section 9.3).                                              |
| **Energy Spectrum**        | $                                    | F(\omega)                        | ^2$                                                                                                              | Power spectral density | Distribution of signal energy across frequency space (Section 7.2.2). |
| **3-dB Bandwidth**         | $\Omega = 2\pi B$                    | Half-power width                 | Frequency where energy spectrum falls to half its DC value $                                                     | F(\Omega)              | ^2 = \frac{1}{2}                                                      | F(0) | ^2$ (Section 7.2.3).  |
| **Unit Step**              | $u(t)$                               | Heaviside step                   | $u(t) = 1$ for $t > 0$, $0$ for $t < 0$ (Section 7.1).                                                           |
| **Unit Rectangle**         | $\text{rect}(t)$                     | Boxcar, Gate function            | $\text{rect}(t) = 1$ for $                                                                                       | t                      | < 1/2$, $0$ for $                                                     | t    | > 1/2$ (Section 7.1). |
| **Sinc Function**          | $\text{sinc}(t) = \frac{\sin(t)}{t}$ | Normalized sinc                  | Unnormalized form: $\text{sinc}(0) = 1$, zeros at $t = k\pi$ ($k \neq 0$) (Section 7.1).                         |
| **Unit Triangle**          | $\Delta(t)$                          | Tent function                    | $\Delta(t) = 1 - 2                                                                                               | t                      | $ for $                                                               | t    | \le 1/2$, $0$ for $   | t   | > 1/2$ (Section 7.1). |
| **Impulse**                | $\delta(t)$                          | Dirac delta function             | Distribution defined by sifting property $\int_{-\infty}^{\infty} \delta(t-t_0) f(t) dt = f(t_0)$ (Section 9.2). |

---

## 5. Laplace Transforms & System Stability (Chapter 11 & 12)

| Standard Term             | Symbol / Form                                      | Discouraged / Non-Standard Terms | Rationale & Context                                                                                                        |
| :------------------------ | :------------------------------------------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| **Laplace Transform**     | $\hat{H}(s) = \int_{0^-}^{\infty} h(t) e^{-st} dt$ | Unilateral Laplace               | One-sided Laplace transform operating on causal signals $t \ge 0^-$ (Section 11.1).                                        |
| **Region of Convergence** | ROC                                                | Convergence region               | Region of the $s$-plane where Laplace integral converges: $\{s : \text{Re}\{s\} > \sigma_0\}$ (Section 11.1.1).            |
| **BIBO Stability**        | BIBO stable                                        | Externally stable                | Bounded-Input Bounded-Output stability ($\int_{-\infty}^{\infty}                                                           | h(t)               | dt < \infty$) (Section 10.2 / 11.1.1).                                 |
| **Asymptotic Stability**  | Asymptotically stable                              | Internally stable                | All characteristic poles lie strictly in Left Half-Plane ($\text{Re}\{s\} < 0$) (Section 11.4.1).                          |
| **Marginal Stability**    | Marginally stable                                  | Semi-stable                      | Simple (non-repeated) poles on imaginary axis $\text{Re}\{s\} = 0$, no RHP poles (Section 11.4.2).                         |
| **Frequency Response**    | $H(\omega) = \hat{H}(j\omega)$                     | System gain                      | Transfer function evaluated on imaginary axis $s = j\omega$ for stable systems (Section 11.1.1).                           |
| **Amplitude Response**    | $                                                  | H(\omega)                        | $                                                                                                                          | Magnitude response | Magnitude of frequency response versus $\omega$ (Section 5.1).         |
| **Phase Response**        | $\angle H(\omega)$                                 | Phase shift curve                | Phase angle of frequency response versus $\omega$ (Section 5.1).                                                           |
| **Quality Factor**        | $Q = \frac{\omega_0}{2\alpha}$                     | Damping factor                   | Ratio of center frequency to 3-dB bandwidth: $Q = \frac{\text{center frequency}}{\text{3-dB bandwidth}}$ (Section 12.2.2). |
| **Butterworth Filter**    | Butterworth filter                                 | Maximally flat filter            | Filter with maximally flat magnitude response $                                                                            | H(\omega)          | = \frac{1}{\sqrt{1 + (\omega/\Omega)^{2n}}}$ (Section 12.3).           |
| **Distortionless Filter** | Distortionless filter                              | Ideal delay filter               | Filter with flat amplitude $                                                                                               | H(\omega)          | = K$ and linear phase $\angle H(\omega) = -\omega t_0$ (Section 12.1). |

---

## Summary of Core UI & Code Rules

1. **Total Response** is the mandatory term for $y(t) = y_h(t) + y_p(t)$.
2. **Homogeneous Solution** is the mandatory term for $y_h(t)$.
3. **Particular Solution** is the mandatory term for $y_p(t)$.
4. **Zero-Input Response** ($y_{\text{ZI}}$) and **Zero-State Response** ($y_{\text{ZS}}$) must be used when decomposing total response by energy source.
5. All mathematical expressions and variables in UI text, labels, and headings MUST be rendered using KaTeX wrappers (`<MathInline>` or `<MathBlock>`). No raw Unicode math characters ($\sum, \int, \omega, \pi, \sigma, \le, \ge$).
