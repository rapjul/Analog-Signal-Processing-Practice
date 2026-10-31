<script lang="ts">
	import MathBlock from "$lib/components/math/MathBlock.svelte";
	import MathText from "$lib/components/math/MathText.svelte";
</script>

<section>
	<h3>Laplace conventions and convergence</h3>
	<MathBlock
		math={String.raw`X(s)=\int_{-\infty}^{\infty}x(t)e^{-st}\,dt,\qquad Y_+(s)=\int_{0^-}^{\infty}y(t)e^{-st}\,dt`}
		compact
	/>
	<p>
		The bilateral transform requires a region of convergence to identify the
		inverse. Unilateral initial-value problems use the given state at zero
		minus.
	</p>
	<p>
		Factor numerator and denominator, always check for common factors,
		cancel matching multiplicities, then identify surviving zeros and poles.
		Near-matching factors do not cancel.
	</p>
	<MathBlock
		math={String.raw`\frac{1}{(s-a)^k}\longleftrightarrow\frac{t^{k-1}}{(k-1)!}e^{at}u(t),\quad\operatorname{Re}(s)>a`}
		compact
	/>
	<MathBlock
		math={String.raw`\frac{1}{(s-a)^k}\longleftrightarrow-\frac{t^{k-1}}{(k-1)!}e^{at}u(-t),\quad\operatorname{Re}(s)<a`}
		compact
	/>
</section>
<section>
	<h3>Conjugate poles, delays, and impulses</h3>
	<MathBlock
		math={String.raw`\frac{s-a}{(s-a)^2+\omega^2}\longleftrightarrow e^{at}\cos(\omega t)u(t)`}
		compact
	/>
	<MathBlock
		math={String.raw`\frac{\omega}{(s-a)^2+\omega^2}\longleftrightarrow e^{at}\sin(\omega t)u(t)`}
		compact
	/>
	<p>
		<MathText
			text={String.raw`These right-sided pairs have $\operatorname{Re}(s)>a$. For left-sided support, negate the time expression and use $\operatorname{Re}(s)<a$.`}
		/>
	</p>
	<MathBlock
		math={String.raw`e^{-ds}F(s)\longleftrightarrow f(t-d),\qquad 1\longleftrightarrow\delta(t)`}
		compact
	/>
	<p>
		Shift the support along with the function. Divide improper rational
		expressions first. Constant quotients produce impulses; impulse
		derivatives are deferred. Never multiply an impulse by a discontinuous
		step.
	</p>
</section>
<section>
	<h3>Unilateral derivatives and system interpretation</h3>
	<MathBlock
		math={String.raw`\mathcal L_+\{y'\}=sY-y(0^-),\qquad\mathcal L_+\{y''\}=s^2Y-sy(0^-)-y'(0^-)`}
		compact
	/>
	<p>
		Separate zero-input and zero-state contributions. Integrating across an
		impulse gives a jump in the derivative one order below the differential
		equation's order, equal to the impulse weight divided by its leading
		coefficient.
	</p>
	<p>
		ROC boundaries are adjacent distinct genuine-pole real parts. A system
		is BIBO stable when its ROC includes the imaginary axis. A reduced
		transfer function alone does not establish internal stability.
	</p>
</section>

<style>
	section {
		min-width: 0;
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 1rem;
		margin-bottom: 1rem;
	}
	p {
		overflow-wrap: anywhere;
	}
</style>
