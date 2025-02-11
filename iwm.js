import axios from 'axios';
import url from 'url'
import useInit from "./init.js";

const useIwm = () => {
	const BASE_URL = 'https://www.itsworthmore.com'
	const {productPricingExtraData} = useInit();
	const $main = {
		activeAnswerMessages: [],
		activeQuestion: {
			answers: [],
			attributes: [],
			breadcrumb: false,
			label: '',
			questionId: undefined,
			setId: undefined,
			text: '',
			tooltip: '',
			tooltip_content: '',
			tooltip_title: '',
			tooltip_youtube: '',
			type: 0
		},
		addToBox: () => $main,
		addToBoxCallback: () => $main,
		answerFilter: '',
		answerMessages: {
			condition: {}
		},
		answerMetaPattern: /(\{([\w-]*)\:\:\[([\w-]*)\]\})/g,
		attributeExtras: {},
		backBtn: (event) => $main,
		breadcrumb: '',
		checkPreviousAnswers: () => {
			$main.previousAnswers = [];
			if (!$main.originalKeyedPricingPath) {
				return false;
			}
			const coordinates = ($main.activeQuestion.setId + 1) + "," + ($main.activeQuestion.questionId + 1);
			$main.previousAnswers = $main.originalKeyedPricingPath[coordinates] || [];
			return $main;
		},
		continueBasedOffAnswers: async (answerDetails) => {
			if ($main.isMulti) {
				await $main.setActiveQuestion("next");
			} else {
				switch (answerDetails[0]['result']) {
					case 4:
						$main.price = answerDetails[0]['value'];
						break;
					case 0:
						await $main.triggerFinalOffer();
						break;
					case 1:
						await $main.setActiveQuestion("next");
						break;
					case 2:
						await $main.setActiveQuestion(answerDetails[0]['go_to']);
						break;
					default:
						$main.triggerNoOffer();
						break;
				}
			}
			$main.selectedAnswers = [];
			$main.activeAnswerMessages = [];
			$main.answerFilter = '';
			return $main;
		},
		couponCode: "",
		coupon_bonus: 0,
		coupon_bonus_to_be_added: 0,
		coupon_max_payout: 0,
		coupon_max_payout_remaining: 0,
		csrfToken: '',
		currentQuoteId: false,
		element: undefined,
		errorMessage: '',
		finalOfferAnimateIn: () => $main,
		finalOfferAnimateInPrep: () => $main,
		finalOfferBlock: undefined,
		finalPricingPath: '',
		getActiveAnswerMessages: () => {
			let messages = [];
			const self = $main;
			$main.getAnswers($main.selectedAnswers).forEach(function (answer) {
				if (answer.attributes) {
					answer.attributes.forEach(function (att) {
						if (self.answerMessages[att.key] && self.answerMessages[att.key][att.value]) {
							messages = messages.concat(self.answerMessages[att.key][att.value]);
						}
					});
				}
			});
			return [...new Set(messages)];
		},
		getAnswerExtra: (metaType, value, extraType) => {
			const extraKey = metaType + "-" + extraType;
			value = '[' + value + ']';
			if ($main.attributeExtras[extraKey] && $main.attributeExtras[extraKey][value]) {
				return $main.attributeExtras[extraKey][value];
			}
			return "";
		},
		getAnswerPathKey: (answer) => {
			switch (answer['result']) {
				case 0:
					return "final";
				case 1:
					return "next";
				case 2:
					return answer['go_to'];
				case 4:
					return "final";
			}
			return "no-offer";
		},
		getCouponDetails: async function () {
			if ($main.initializing) {
				return false;
			}

			$main.hasCouponApplied = false;
			$main.coupon_bonus = 0;
			$main.coupon_bonus_to_be_added = 0;
			$main.coupon_max_payout = 0;
			$main.coupon_max_payout_remaining = 0;
			$main.isGiftCardBonusEnabled = false;
			$main.gift_card_bonus = 0;

			const data = {
				'price': $main.price,
			};

			try {
				const response = await axios.get(url.resolve(BASE_URL, 'widget/get-coupon-details'), {
					params: data
				});
				const result = response.data;
				if (result.hasCouponApplied) {
					$main.hasCouponApplied = result.hasCouponApplied;
					$main.coupon_bonus = result.coupon_bonus;
					$main.coupon_bonus_to_be_added = result.coupon_bonus_to_be_added;
					$main.coupon_max_payout = result.coupon_max_payout;
					$main.coupon_max_payout_remaining = result.coupon_max_payout_remaining;
				}
				if (result.isGiftCardBonusEnabled) {
					$main.isGiftCardBonusEnabled = result.isGiftCardBonusEnabled;
					$main.gift_card_bonus = result.gift_card_bonus;
				}
			} catch (error) {
				console.error('Error fetching coupon details:', error);
			}
			return $main;
		},
		getQuestion: (coordinates) => {
			coordinates = coordinates.trim().split(",");
			if (coordinates.length === 2) {
				const set = parseInt(coordinates[0]) - 1;
				const question = parseInt(coordinates[1]) - 1;
				if ($main.pricingData &&
					$main.pricingData[set] &&
					$main.pricingData[set].questions &&
					$main.pricingData[set].questions[question]) {
					const questionData = {...$main.pricingData[set].questions[question]};
					questionData.setId = set;
					questionData.questionId = question;
					return questionData;
				}
			}
			return false;
		},
		goToNextQuestion: async () => {
			if ($main.isRequired && $main.selectedAnswers.length === 0) {
				$main.selectOptionMessage = true;
				return false;
			}
			const answerDetails = $main.getAnswers($main.selectedAnswers);
			if ($main.activeAnswerMessages.length === 0) {
				$main.activeAnswerMessages = $main.getActiveAnswerMessages();
				if ($main.activeAnswerMessages.length !== 0) {
					return $main;
				}
			}
			$main.pricingPath.push($main.selectedAnswers);
			answerDetails.forEach((answerDetail) => {
				if (answerDetail) {
					$main.price += answerDetail.value;
					if ($main.activeQuestion.breadcrumb === true) {
						$main.breadcrumb += $main.breadcrumb.length ? ", " + answerDetail.text : answerDetail.text;
					}
				}
			});
			await $main.continueBasedOffAnswers(answerDetails);
			return $main;
		},
		goToPreviousQuestion: async () => {
			// If we have an active answer message, clear it and do nothing else
			if ($main.activeAnswerMessages.length > 0) {
				$main.activeAnswerMessages = [];
				return false;
			}
			// Clear out the final pricing path
			$main.setFinalPricingPath("");
			// Step back through the form and quickly re-answer each question
			const previousPricingPath = $main.pricingPath;
			await $main.resetForm();
			previousPricingPath.forEach((selectedAnswers, key) => {
				$main.selectedAnswers = selectedAnswers;
				if (key < previousPricingPath.length - 1) {
					$main.goToNextQuestion();

					// If answer messages were shown, press "continue"
					if ($main.activeAnswerMessages.length) {
						$main.goToNextQuestion();
					}
				}
			});
			// Reset message
			$main.selectOptionMessage = false;
			// Check if we need to show "Previous Answer" labels
			$main.checkPreviousAnswers();
			return $main;
		},
		hasCouponApplied: false,
		init: async (initData, itemToken = '', checkPreviousPricing = false) => {
			let json;
			$main.initializing = true;
			// Parse in product attribute extras
			if (!$main.attributeExtras.length) {
				json = productPricingExtraData || [];
				$main.attributeExtras = json.length ? JSON.parse(Buffer.from(json, 'base64').toString()) : [];
			}
			// Parse in pricing data
			json = initData.pricingData || [];
			if (!json.length) {
				$main.triggerError("There was an error loading the pricing form for $main product. Please try again later.");
				return false;
			}
			$main.setPricingData(JSON.parse(Buffer.from(json, 'base64').toString()));
			// Check if there was an original pricing path
			$main.originalKeyedPricingPath = checkPreviousPricing ? (initData.originalKeyedPricingPath || []) : [];
			// Inventory item token
			$main.inventoryItemToken = itemToken;
			// Set product details
			$main.productName = initData.productName || 'product';
			$main.productBrand = initData.productBrand || '';
			$main.productCategory = initData.productCategory || '';
			$main.productCategory2 = initData.productCategory2 || '';
			$main.productCategory3 = initData.productCategory3 || '';
			// Set the coupon code
			$main.couponCode = initData.couponCode || '';
			// Configure model token fields
			$main.pricingToken = initData.pricingToken;
			// Configure answer messages
			$main.answerMessages = $main.initAnswerMessages(initData.answerMessages);
			$main.questionLabels = initData.questionLabels || {};
			$main.activeAnswerMessages = [];
			// Reset form
			await $main.resetForm();
			// Update token
			$main.csrfToken = initData._token || "";
			// Turn eval mode off by default
			$main.setIsEvalMode(false);
			// End initialization
			$main.initializing = false;
			return $main;
		},
		initAnswerMessages: (answerMessageData) => {
			const messages = {};
			const decodedData = Buffer.from(answerMessageData, 'base64').toString('utf-8');
			JSON.parse(decodedData).forEach(data => {
				if (!messages[data.attribute_key]) {
					messages[data.attribute_key] = {};
				}
				if (!messages[data.attribute_key][data.attribute_value]) {
					messages[data.attribute_key][data.attribute_value] = [];
				}
				messages[data.attribute_key][data.attribute_value].push(data.message);
			});
			return messages;
		},
		initFromAjax: async function (itemToken, pricingToken, callback) {
			if ($main.initializing === true) {
				return $main;
			}
			$main.initializing = true;
			try {
				const response = await axios.get(`${BASE_URL}/widget/product-pricing/${pricingToken}/${itemToken}`, {
					headers: {
						'Accept': 'application/json'
					}
				});
				await $main.wipe();
				await $main.init(response.data, itemToken);
			} catch (error) {
				$main.triggerError(`There was an error loading the pricing form for $main product. Please try again later. Reason: ${error.message}`);
				// console.error('Error:', error);
			} finally {
				$main.initializing = false;
				if (callback && typeof callback === 'function') {
					callback();
				}
			}
			return $main;
		},
		initFromAjaxUsingItem: async function (itemToken, callback) {
			if ($main.initializing === true) {
				return $main;
			}
			$main.initializing = true;
			try {
				const response = await axios.get(`${BASE_URL}/admin/widget/product-pricing-from-item/${itemToken}`, {
					headers: {
						'Accept': 'application/json'
					}
				});
				await $main.wipe();
				await $main.init(response.data, itemToken, false);
			} catch (error) {
				$main.triggerError("There was an error loading the pricing form for $main product. Please try again later.");
				console.error('Error:', error);
			} finally {
				$main.initializing = false;
				if (callback && typeof callback === 'function') {
					callback();
				}
			}
			return $main;
		},
		initializing: false,
		inventoryItemToken: '',
		isEvalMode: false,
		isGiftCardBonusEnabled: false,
		isMulti: false,
		isRequired: false,
		itemsArray: () => {
			const itemsArray = [];
			itemsArray.push({
				item_id: $main.productName + ', ' + $main.breadcrumb,
				item_name: $main.productName,
				affiliation: "ItsWorthMore.com LLC",
				coupon: $main.couponCode,
				currency: "USD",
				item_brand: $main.productBrand,
				item_category: $main.productCategory,
				item_category2: $main.productCategory2,
				item_category3: $main.productCategory3,
				price: $main.price,
				quantity: 1
			});
			return itemsArray;
		},
		lastQuoteAttemptId: 0,
		nextBtn: () => $main,
		originalKeyedPricingPath: [],
		previousAnswers: [],
		price: 0,
		pricingData: [],
		pricingToken: '',
		productBrand: '',
		productCategory: '',
		productCategory2: '',
		productCategory3: '',
		productName: '',
		questionLabels: {},
		resetForm: async () => {
			await $main.setActiveQuestion("1,1");
			$main.setFinalPricingPath("");
			$main.price = 0;
			$main.status = "calculating";
			$main.pricingPath = [];
			$main.selectedAnswers = [];
			$main.activeAnswerMessages = [];
			$main.breadcrumb = "";
			return $main;
		},
		saveErrorMessage: '',
		savePricingQuote: async function () {
			// Ignore $main if initializing
			if ($main.initializing) {
				return false;
			}
			// Only update the current quote if $main is the last quote
			const $mainQuoteAttemptId = ++$main.lastQuoteAttemptId;
			$main.currentPricingQuoteToken = false;
			// Set data
			const data = {
				'_token': $main.csrfToken,
				'product-pricing-path': JSON.stringify($main.pricingPath),
				'product-pricing-token': $main.pricingToken,
				'inventory-item-token': $main.inventoryItemToken,
			};
			try {
				const response = await axios.post(
					`${BASE_URL}/widget/save-product-pricing-quote`,
					data,
					{
						headers: {
							'Content-Type': 'application/json',
							'Accept': 'text/plain'
						}
					}
				);
				if ($mainQuoteAttemptId === $main.lastQuoteAttemptId) {
					$main.currentPricingQuoteToken = response.data;
				}
				// Log the event (replace with your preferred logging method)
				console.log('Get Quote', {
					ItemName: $main.productName,
					Attributes: $main.breadcrumb,
					Breadcrumb: `${$main.productName}-${$main.breadcrumb.split(',').map(s => s.trim()).join('-')}`.replace(/-+/g, '-')
				});
			} catch (error) {
				console.error('Error saving pricing quote:', error.message);
				$main.saveErrorMessage = 'Failed to save pricing quote';
			}
			return $main;
		},
		getAnswers: (answerIds) => {
			return answerIds.map(answerId => {
				return $main.activeQuestion['answers'][answerId];
			}).filter(answer => answer !== undefined);
		},
		selectAnswer: async function (answerId, options = {}) {
			$main.activeAnswerMessages = [];
			// Handle different actions based on options
			if (options.action === 'next') {
				return $main.goToNextQuestion();
			} else if (options.action === 'previous') {
				return $main.goToPreviousQuestion();
			}
			$main.selectOptionMessage = false;
			if ($main.isMulti) {
				const index = $main.selectedAnswers.indexOf(answerId);
				if (index === -1) {
					$main.selectedAnswers.push(answerId);
				} else {
					$main.selectedAnswers.splice(index, 1);
				}
			} else {
				$main.selectedAnswers = [answerId];
				// If $main is NOT a multi, and there are pricing answers, show them now
				$main.activeAnswerMessages = $main.getActiveAnswerMessages();
				// Proceed to next question if we don't have any answer messages
				if ($main.activeAnswerMessages.length === 0) {
					await $main.goToNextQuestion();
				}
			}
			return $main;
		},
		selectedAnswers: [],
		setActiveQuestion: async (coordinates) => {
			// Check for "next" question shortcut
			if (coordinates === 'next') {
				coordinates = ($main.activeQuestion.setId + 1) + "," + ($main.activeQuestion.questionId + 2);
			}
			// Load question using coordinates
			const questionData = $main.getQuestion(coordinates);
			if (questionData) {
				$main.activeQuestion = questionData;
				if ($main.activeQuestion.label && $main.questionLabels[$main.activeQuestion.label]) {
					let hasDBQuestion = false;
					if ($main.questionLabels[$main.activeQuestion.label]['question']) {
						$main.activeQuestion.text = $main.questionLabels[$main.activeQuestion.label]['question'];
						hasDBQuestion = true;
					}
					if (hasDBQuestion) {
						$main.activeQuestion.tooltip_title = $main.questionLabels[$main.activeQuestion.label]['tooltip'];
						$main.activeQuestion.tooltip_content = $main.questionLabels[$main.activeQuestion.label]['description'];
						if ($main.questionLabels[$main.activeQuestion.label]['tooltip_youtube']) {
							$main.activeQuestion.tooltip_youtube = "https://www.youtube.com/embed/" + $main.questionLabels[$main.activeQuestion.label]['tooltip_youtube'];
						}
					}
				}
				//0 => 'Single: Required', 1 => 'Multiple: Required', 2 => 'Multiple: Optional'
				$main.isMulti = $main.activeQuestion.type > 0;
				$main.isRequired = $main.activeQuestion.type < 2;
				// Check if we need to show "Previous Answer" labels
				$main.checkPreviousAnswers();
			} else {
				await $main.triggerFinalOffer();
			}
			return $main;
		},
		setFinalPricingPath: (value) => {
			$main.finalPricingPath = value;
			return $main;
		},
		setIsEvalMode: (value) => {
			value = value || null;
			$main.isEvalMode = value === null ? !$main.isEvalMode : !!value;
			return $main;
		},
		setPricingData: function (json) {
			const self = $main;
			Object.keys(json).forEach(function (s) {
				const set = json[s];
				Object.keys(set.questions).forEach(function (q) {
					const question = set.questions[q];
					Object.keys(question.answers).forEach(function (a) {
						const answer = question.answers[a];
						const execMeta = self.answerMetaPattern.exec(answer.text);
						const execText = answer.text.replace(self.answerMetaPattern, "");
						if (execMeta !== null && execMeta[3]) {
							const meta = {
								'type': execMeta[2],
								'value': execMeta[3],
							};
							const extra = {
								'txt': self.getAnswerExtra(meta['type'], meta['value'], 'txt'),
								'img': self.getAnswerExtra(meta['type'], meta['value'], 'img'),
							};
							extra['img_style'] = {
								'background': `url('${extra['img']}') center right no-repeat`
							};
							json[s]['questions'][q]['answers'][a].meta = meta;
							json[s]['questions'][q]['answers'][a].extra = extra;
							json[s]['questions'][q]['answers'][a].text = execText.trim();
						}
					});
				});
			});
			$main.pricingData = json;
			return $main;
		},
		status: 'calculating',
		triggerError: (msg) => {
			$main.errorMessage = msg || "An error has occurred.";
			$main.setFinalPricingPath("");
			$main.status = 'error';
			return $main;
		},
		triggerFinalOffer: async () => {
			// Get coupon details in the background
			await $main.getCouponDetails();
			// Record the pricing quote in the background
			await $main.savePricingQuote();
			// Trigger quote viewed event in the background
			$main.triggerQuoteViewedEvent();
			// Figure out how $main ends
			if ($main.price <= 0) {
				$main.triggerNoOffer();
			} else {
				$main.finalOfferAnimateIn();
				$main.status = 'final-offer';
				$main.setFinalPricingPath(JSON.stringify($main.pricingPath));
			}
			return $main;
		},
		triggerNoOffer: () => {
			$main.status = 'no-offer';
			$main.setFinalPricingPath("");
			return $main;
		},
		triggerQuoteViewedEvent: () => {
			return $main
		},
		wipe: async () => {
			// Reset form
			await $main.resetForm();
			// Wipe data
			$main.pricingData = [];
			$main.inventoryItemToken = "";
			$main.originalKeyedPricingPath = [];
			$main.productName = "";
			$main.pricingToken = "";
			$main.activeAnswerMessages = [];
			$main.initializing = null;
			// Reset form
			return $main;
		}
	}
	return $main
}

export default useIwm