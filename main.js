import useIwm from './iwm.js';
import useInit from './init.js'

const showCurrentQuestionOptions = (iwm) => {
	console.log(`Current Product Name: ${iwm.breadcrumb}`)
	console.log(`${iwm.activeQuestion.label}: `)
	iwm.activeQuestion.answers.forEach(answer => console.log(`- ${answer.text}`))
}

(async () => {
	const {initProductPricingOnLoad} = useInit()
	const iwm = useIwm()
	await iwm.init(initProductPricingOnLoad)

	await iwm.selectAnswer(0)
	showCurrentQuestionOptions(iwm)
	await iwm.selectAnswer(0)
	showCurrentQuestionOptions(iwm)
	await iwm.selectAnswer(0)
	showCurrentQuestionOptions(iwm)
	await iwm.selectAnswer(0)
	await iwm.goToNextQuestion()
	console.log(`Final Price: ${iwm.price}`)
})()