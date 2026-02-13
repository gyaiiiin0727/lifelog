/**
 * voice-input-extra.js
 * 目標追加モーダル & AI相談タブに音声入力ボタンを追加する
 */
(function() {
  'use strict';

  // ========== ブラウザ対応チェック ==========
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return; // 音声認識非対応ブラウザでは何もしない

  var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // ========== CSS注入 ==========
  var style = document.createElement('style');
  style.textContent = [
    '.voice-extra-btn {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  gap: 6px;',
    '  width: 100%;',
    '  padding: 12px;',
    '  border: 2px solid #111;',
    '  border-radius: 10px;',
    '  background: #fff;',
    '  font-size: 14px;',
    '  font-weight: 700;',
    '  cursor: pointer;',
    '  transition: all 0.2s;',
    '  margin-top: 8px;',
    '}',
    '.voice-extra-btn:hover { background: #f5f5f5; }',
    '.voice-extra-btn.listening {',
    '  background: #ef4444;',
    '  border-color: #ef4444;',
    '  color: #fff;',
    '  animation: voiceExtraPulse 1.5s infinite;',
    '}',
    '@keyframes voiceExtraPulse {',
    '  0%, 100% { opacity: 1; }',
    '  50% { opacity: 0.7; }',
    '}',
    '.voice-extra-status {',
    '  font-size: 12px;',
    '  color: #666;',
    '  text-align: center;',
    '  margin-top: 4px;',
    '  min-height: 16px;',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // ========== 汎用音声入力クラス ==========
  function VoiceInput(options) {
    this.buttonId = options.buttonId;
    this.targetId = options.targetId;
    this.statusId = options.statusId || null;
    this.isTextarea = options.isTextarea || false;
    this.recognition = null;
    this.isListening = false;
    this.finalText = '';
    this.shouldRestart = false;
  }

  VoiceInput.prototype.start = function() {
    var self = this;
    var btn = document.getElementById(this.buttonId);
    var target = document.getElementById(this.targetId);
    if (!btn || !target) return;

    if (this.isListening) {
      this.stop();
      return;
    }

    this.recognition = new SR();
    this.recognition.lang = 'ja-JP';
    this.recognition.continuous = !isMobile;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    this.isListening = true;
    this.shouldRestart = true;
    this.finalText = '';
    var lastFinal = '';

    btn.classList.add('listening');
    btn.textContent = '⏹️ 停止';
    this.setStatus('🎤 聞き取り中...');

    this.recognition.onresult = function(e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          if (transcript.trim() && transcript.trim() !== lastFinal) {
            self.finalText += (self.finalText ? '\n' : '') + transcript.trim();
            lastFinal = transcript.trim();
          }
        } else {
          interim = transcript;
        }
      }

      // ターゲットに反映
      var existing = self.getExistingText(target);
      var display = existing;
      if (self.finalText) {
        display += (existing ? '\n' : '') + self.finalText;
      }
      if (interim) {
        display += (display ? '\n' : '') + interim;
      }
      self.setValue(target, display);
      self.setStatus('🎤 ' + (interim || '聞き取り中...'));
    };

    this.recognition.onerror = function(e) {
      if (e.error === 'no-speech' || e.error === 'network') {
        // 自動リスタート
        return;
      }
      if (e.error === 'not-allowed') {
        self.setStatus('⚠️ マイクの許可を確認してください');
      }
      self.stop();
    };

    this.recognition.onend = function() {
      if (self.isListening && self.shouldRestart) {
        // モバイルの場合は再開
        setTimeout(function() {
          if (self.isListening && self.shouldRestart) {
            try { self.recognition.start(); } catch(e) {}
          }
        }, isMobile ? 1100 : 500);
      } else {
        self.cleanup();
      }
    };

    try {
      this.recognition.start();
    } catch(e) {
      this.setStatus('⚠️ 音声入力を開始できませんでした');
      this.cleanup();
    }
  };

  VoiceInput.prototype.stop = function() {
    this.shouldRestart = false;
    this.isListening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch(e) {}
    }
    this.cleanup();
  };

  VoiceInput.prototype.cleanup = function() {
    this.isListening = false;
    this.shouldRestart = false;
    var btn = document.getElementById(this.buttonId);
    if (btn) {
      btn.classList.remove('listening');
      btn.textContent = '🎤 音声入力';
    }

    // 最終テキストをターゲットに確定
    var target = document.getElementById(this.targetId);
    if (target && this.finalText) {
      var existing = this.getExistingText(target);
      // interim を除いた最終結果を設定
      var finalDisplay = existing;
      if (this.finalText) {
        finalDisplay += (existing ? '\n' : '') + this.finalText;
      }
      this.setValue(target, finalDisplay);
    }

    this.setStatus(this.finalText ? '✅ 入力完了' : '');
    this.recognition = null;
    this.finalText = '';
  };

  VoiceInput.prototype.getExistingText = function(target) {
    // 音声入力開始前のテキストを保持するため、初回に保存
    if (this._originalText === undefined) {
      this._originalText = target.value || '';
    }
    return this._originalText;
  };

  VoiceInput.prototype.setValue = function(target, value) {
    target.value = value;
    // input イベントを発火させてフレームワークに通知
    target.dispatchEvent(new Event('input', { bubbles: true }));
  };

  VoiceInput.prototype.setStatus = function(msg) {
    if (this.statusId) {
      var el = document.getElementById(this.statusId);
      if (el) el.textContent = msg;
    }
  };

  // ========== 1. 目標追加モーダルに音声入力ボタン注入 ==========
  var goalVoice = null;

  function injectGoalVoiceButton() {
    var goalInput = document.getElementById('goalInput');
    if (!goalInput) return;
    if (document.getElementById('goalVoiceBtn')) return; // 既に注入済み

    var container = goalInput.closest('.form-group');
    if (!container) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'goalVoiceBtn';
    btn.className = 'voice-extra-btn';
    btn.textContent = '🎤 音声入力';

    var status = document.createElement('div');
    status.id = 'goalVoiceStatus';
    status.className = 'voice-extra-status';

    // テキスト入力の前に挿入
    container.insertBefore(btn, goalInput);
    container.insertBefore(status, goalInput);

    goalVoice = new VoiceInput({
      buttonId: 'goalVoiceBtn',
      targetId: 'goalInput',
      statusId: 'goalVoiceStatus',
      isTextarea: false
    });

    btn.addEventListener('click', function() {
      goalVoice._originalText = undefined; // リセット
      goalVoice.start();
    });
  }

  // ========== 2. AI相談タブに音声入力ボタン注入 ==========
  var aiVoice = null;

  function injectAIConsultVoiceButton() {
    var textarea = document.getElementById('aiConsultInput');
    if (!textarea) return;
    if (document.getElementById('aiConsultVoiceBtn')) return; // 既に注入済み

    var inputArea = textarea.closest('.ai-consult-input-area');
    if (!inputArea) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'aiConsultVoiceBtn';
    btn.className = 'voice-extra-btn';
    btn.textContent = '🎤 音声入力';

    var status = document.createElement('div');
    status.id = 'aiConsultVoiceStatus';
    status.className = 'voice-extra-status';

    // テキストエリアの直前に挿入
    inputArea.insertBefore(status, textarea);
    inputArea.insertBefore(btn, status);

    aiVoice = new VoiceInput({
      buttonId: 'aiConsultVoiceBtn',
      targetId: 'aiConsultInput',
      statusId: 'aiConsultVoiceStatus',
      isTextarea: true
    });

    btn.addEventListener('click', function() {
      aiVoice._originalText = undefined; // リセット
      aiVoice.start();
    });
  }

  // ========== 初期化 ==========
  function init() {
    injectGoalVoiceButton();
    injectAIConsultVoiceButton();

    // 目標追加モーダルが開かれるたびにボタンを確認
    var goalModal = document.getElementById('goalAddModal');
    if (goalModal) {
      var observer = new MutationObserver(function() {
        injectGoalVoiceButton();
      });
      observer.observe(goalModal, { attributes: true, attributeFilter: ['style'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 150);
  }
})();
