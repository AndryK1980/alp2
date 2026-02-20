(function () {
  "use strict";

  var MIN_FILL_TIME_MS = 3000;
  var CAPTCHA_CORRECT_ANSWER = "4";

  function setMessage(messageElement, text, type) {
    if (!messageElement) {
      return;
    }

    messageElement.textContent = text || "";
    messageElement.classList.remove("text-red-600", "text-green-600", "text-slate-600");

    if (type === "error") {
      messageElement.classList.add("text-red-600");
      return;
    }

    if (type === "success") {
      messageElement.classList.add("text-green-600");
      return;
    }

    messageElement.classList.add("text-slate-600");
  }

  function normalizePayload(form) {
    return {
      name: (form.elements.name.value || "").trim(),
      phone: (form.elements.phone.value || "").trim(),
      address: (form.elements.address.value || "").trim(),
    };
  }

  function lockSubmit(button) {
    if (!button) {
      return;
    }

    button.disabled = true;
    button.dataset.initialText = button.dataset.initialText || button.textContent;
    button.textContent = "Отправка...";
    button.classList.add("opacity-70", "cursor-not-allowed");
  }

  function unlockSubmit(button) {
    if (!button) {
      return;
    }

    button.disabled = false;
    button.textContent = button.dataset.initialText || "Отправить заявку";
    button.classList.remove("opacity-70", "cursor-not-allowed");
  }

  // Функция для форматирования телефона
  function formatPhoneNumber(inputElement) {
    if (!inputElement) return;
    
    // Удаляем все символы, кроме цифр
    let value = inputElement.value.replace(/\D/g, '');
    
    // Ограничиваем длину до 11 цифр (для РФ: 7 + 10 цифр)
    if (value.length > 11) {
      value = value.slice(0, 11);
    }
    
    // Форматируем
    let formattedValue = '';
    
    if (value.length > 0) {
      // Код страны (7)
      if (value[0] !== '7' && value[0] !== '8') {
        // Если первая цифра не 7 или 8, добавляем 7 автоматически
        value = '7' + value;
      } else if (value[0] === '8') {
        // Заменяем 8 на 7
        value = '7' + value.slice(1);
      }
      
      // Форматирование +7 (XXX) XXX-XX-XX
      if (value.length > 0) {
        formattedValue = '+' + value.substring(0, 1);
      }
      if (value.length >= 2) {
        formattedValue += ' (' + value.substring(1, 4);
      }
      if (value.length >= 5) {
        formattedValue += ') ' + value.substring(4, 7);
      }
      if (value.length >= 8) {
        formattedValue += '-' + value.substring(7, 9);
      }
      if (value.length >= 10) {
        formattedValue += '-' + value.substring(9, 11);
      }
    }
    
    inputElement.value = formattedValue;
  }

  // Обработка удаления (backspace) чтобы курсор не прыгал
  function handlePhoneKeyDown(event) {
    const input = event.target;
    
    if (event.key === 'Backspace') {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      
      // Если выделен текст, удаляем его через стандартное поведение
      if (start !== end) {
        return;
      }
      
      // Если курсор в конце, удаляем последний символ
      if (start === input.value.length) {
        event.preventDefault();
        
        let value = input.value.replace(/\D/g, '');
        value = value.slice(0, -1);
        
        // Переформатируем
        let formattedValue = '';
        if (value.length > 0) {
          if (value[0] !== '7') {
            value = '7' + value;
          }
          
          formattedValue = '+' + value.substring(0, 1);
          if (value.length >= 2) formattedValue += ' (' + value.substring(1, 4);
          if (value.length >= 5) formattedValue += ') ' + value.substring(4, 7);
          if (value.length >= 8) formattedValue += '-' + value.substring(7, 9);
          if (value.length >= 10) formattedValue += '-' + value.substring(9, 11);
        }
        
        input.value = formattedValue;
      }
    }
  }

  function initOrderForm() {
    var form = document.getElementById("order-form");
    if (!form) {
      return;
    }

    var messageElement = document.getElementById("form-message");
    var submitButton = document.getElementById("submit-button");
    var honeypot = form.elements.website;
    var captcha = form.elements.captcha;
    var phoneInput = form.elements.phone;
    var fillStartTime = null;
    var isSubmitting = false;

    // Добавляем обработчики для форматирования телефона
    if (phoneInput) {
      phoneInput.addEventListener('input', function() {
        formatPhoneNumber(this);
      });
      
      phoneInput.addEventListener('keydown', handlePhoneKeyDown);
      
      // Форматируем телефон при потере фокуса
      phoneInput.addEventListener('blur', function() {
        formatPhoneNumber(this);
      });
    }

    form.addEventListener(
      "focusin",
      function (event) {
        if (fillStartTime !== null) {
          return;
        }

        var target = event.target;
        if (!target || target.name === "website") {
          return;
        }

        fillStartTime = Date.now();
      },
      true
    );

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (isSubmitting) {
        return;
      }

      setMessage(messageElement, "", "default");

      if (honeypot && honeypot.value.trim() !== "") {
        return;
      }

      if (fillStartTime === null) {
        return;
      }

      if (Date.now() - fillStartTime < MIN_FILL_TIME_MS) {
        return;
      }

      if (!captcha || captcha.value.trim() !== CAPTCHA_CORRECT_ANSWER) {
        setMessage(messageElement, "Неверный ответ на антиспам-вопрос. Попробуйте еще раз.", "error");
        if (captcha) {
          captcha.focus();
        }
        return;
      }

      var privacyCheckbox = form.elements.privacy;
      if (privacyCheckbox && !privacyCheckbox.checked) {
        setMessage(messageElement, "Необходимо согласиться с политикой конфиденциальности.", "error");
        privacyCheckbox.focus();
        return;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var payload = normalizePayload(form);
      isSubmitting = true;
      lockSubmit(submitButton);

      try {
        if (typeof window.sendToTelegram !== "function") {
          throw new Error("sendToTelegram is not available");
        }

        var result = await window.sendToTelegram(payload);

        // TODO: Проверить отложенную отправку в Telegram
        if (result && result.ok) {
          setMessage(messageElement, "Заявка отправлена. Мы свяжемся с вами в ближайшее время.", "success");
        } else if (result && result.queued) {
          setMessage(
            messageElement,
            "Связь временно недоступна. Заявка сохранена и будет отправлена автоматически.",
            "success"
          );
        } else {
          setMessage(
            messageElement,
            "Не удалось отправить заявку прямо сейчас. Попробуйте немного позже.",
            "error"
          );
        }

        if (result && (result.ok || result.queued)) {
          form.reset();
          fillStartTime = null;
        }
      } catch (error) {
        setMessage(messageElement, "Ошибка отправки. Попробуйте еще раз.", "error");
      } finally {
        isSubmitting = false;
        unlockSubmit(submitButton);
      }
    });
  }

  window.addEventListener("DOMContentLoaded", initOrderForm);
})();