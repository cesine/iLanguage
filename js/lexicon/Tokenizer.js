
(function(exports) {
  var MorphemeSegmenter = exports.MorphemeSegmenter || require('./MorphemeSegmenter').MorphemeSegmenter;
  var Corpus2Morphology = exports.Corpus2Morphology || require('./../core/corpus2morphology').Corpus2Morphology;

  /* http://jrgraphix.net/research/unicode_blocks.php */
  var defaults = {
    punctuationArray: ['\u0021-\u002C', '\u002E-\u002F', '\u003A-\u0040', '\u005B-\u0060', '\u007B-\u007E', '\u3031-\u3035', '\u309b', '\u309c', '\u30a0', '\u30fc', '\uff70', '\u2000-\u206F'],
    fineWordInternallyButNotExternallyArray: ['-', '\'', '-', '-'],
    wordDelimitersArray: [],
    // morphemesRegExp = /[はをがはのに。、「」、。・]+/g;
    languages: {
      ja: {
        punctuationArray: ['\u3000-\u303f'],
        wordBoundaryMorphemes: ['の','に']
        // This list resutls in false segmentations?
        // 'もの','いし', 'い', 'いは', 'かしら', 'かどうか', 'かい', 'か', 'かな', 'かも', 'かも知れない', 'から', 'が', 'き', 'きり', 'ぎゃ', 'く', 'くせに', 'け', 'けど', 'けん', 'こ', 'こえ', 'こそ', 'ころ', 'ごろ', 'さ', 'しか', 'して', 'し', 'すら', 'す', 'せ', 'ぜ', 'たら', 'だけ', 'だに', 'だの', 'そ', 'ぞ', 'た', 'っけ', 'ったら', 'って', 'っ', 'つ', 'つつ', 'ても', 'て', 'では', 'でも', 'で', 'といえども', 'とか', 'ところで', 'として', 'とて', 'とは', 'とも', 'と', 'どころか', 'ども', 'どんだけ', 'な', 'なぁ', 'ながら', 'など', 'なら', 'なりに', 'なり', 'なん', 'なんか', 'なんて', 'なんで', 'について', 'にて', 'に', 'には', 'にゃ', 'ね', 'ので', 'のに', 'のみ', 'の', 'は', 'ば', 'ばかり', 'ばかりか', 'ばっか', 'ばかし', 'へ', 'ほど', 'ほ', 'まで', 'までに', 'ま', 'まま', 'まんま', 'もの', 'ものの', 'もん', 'も', 'やら', 'や', 'より', 'よーん', 'よ', 'らむ', 'ら', 'わ', 'をして', 'を', 'んで','ん', 'ゟ', 'ザ', 'ママ', 'ヶ', '丈', '乍ら', '今や', '儘', '切り', '所か', '所で', '程', '草', '迄']
        // wordBoundaryMorphemes: ['\u3040-\u309F', '\u30A0-\u30FF']
      }
    }
  };
  // ^(@|https?:
  var regExpEscape = function(s) {
    return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').
    replace(/\x08/g, '\\x08');
  };

  var tokenizeInput = function(doc) {
    if (!doc.orthography || !doc.orthography.length) {
      doc.orthographyArray = [];
      doc.orthographicWords = [];
      return doc;
    }
    if (doc.punctuationArray && doc.punctuationArray.length === 0) {
      doc.punctuationArray = null;
    }
    if (doc.wordDelimitersArray && doc.wordDelimitersArray.length === 0) {
      doc.wordDelimitersArray = null;
    }
    if (doc.fineWordInternallyButNotExternallyArray && doc.fineWordInternallyButNotExternallyArray.length === 0) {
      doc.fineWordInternallyButNotExternallyArray = null;
    }
    if (doc.morphemeSegmentationOptions) {
      doc = MorphemeSegmenter.runSegmenter(doc);
    }

    var orthographicTokens = [],
      orthographicWords = [],
      text = doc.orthography.trim(),
      punctuationArray = doc.punctuationArray || defaults.punctuationArray,
      wordDelimitersArray = doc.wordDelimitersArray || defaults.wordDelimitersArray,
      wordBoundaryMorphemes = doc.wordBoundaryMorphemes || [],
      fineWordInternallyButNotExternallyArray = doc.fineWordInternallyButNotExternallyArray || defaults.fineWordInternallyButNotExternallyArray;

    // fineWordInternallyButNotExternallyArray = fineWordInternallyButNotExternallyArray.concat(doc.punctuation); //TODO test this
    if (doc.caseSensitivity === "lower") {
      text = text.toLocaleLowerCase();
    }
    if (doc.userDefinedCleaningReWriteRules) {
      for (var rule in doc.userDefinedCleaningReWriteRules) {
        if (!doc.userDefinedCleaningReWriteRules.hasOwnProperty(rule)) {
          continue;
        }
        text = text.replace(
          new RegExp(doc.userDefinedCleaningReWriteRules[rule].source, 'g'),
          doc.userDefinedCleaningReWriteRules[rule].target);
      }
    }

    doc.tokenizeOnTheseArray = punctuationArray.concat(wordDelimitersArray);

    /**
    Add language specific punctionation, and word boundary morphemesArray
    */
    if (!doc.language && doc.orthography.indexOf('。') > -1) {
      doc.language = {
        iso: 'ja'
      };
      doc.tokenizeOnTheseArray = doc.tokenizeOnTheseArray.concat(defaults.languages.ja.punctuationArray);
      wordBoundaryMorphemes = wordBoundaryMorphemes.concat(defaults.languages.ja.wordBoundaryMorphemes);
    }

    doc.tokenizeOnTheseRegExp = new RegExp('([' + doc.tokenizeOnTheseArray.join('') + '])', 'g');
    if (wordBoundaryMorphemes && wordBoundaryMorphemes.length > 0) {
      doc.wordBoundaryMorphemesRegExp = new RegExp('([' + wordBoundaryMorphemes.join() + '])', 'g');
      text = text.replace(doc.wordBoundaryMorphemesRegExp, ' $1 ');
    }
    text = text.replace(doc.tokenizeOnTheseRegExp, ' $1 ');

    doc.wordExternalPunctuationRegExp = new RegExp('(' + '^[' + fineWordInternallyButNotExternallyArray.join('') + ']' + '|' + '[' + fineWordInternallyButNotExternallyArray.join('') + ']$' + ')', 'g');
    // console.log("Regexp " + doc.tokenizeOnTheseRegExp);
    text.split(/\s/).map(function(wordOrSymbol) {
      // console.log('wordOrSymbol ' + wordOrSymbol);
      wordOrSymbol = wordOrSymbol.replace(doc.wordExternalPunctuationRegExp, ' $1 ').trim();
      if (wordOrSymbol) {
        // console.log('wordOrSymbol ' + wordOrSymbol);
        var escapedPunctuation = new RegExp('([' + regExpEscape(doc.tokenizeOnTheseArray.join('')) + '])', 'g');
        if (wordOrSymbol.length === 1) {
          orthographicTokens.push(wordOrSymbol);
          // if (!doc.tokenizeOnTheseRegExp.test(regExpEscape(wordOrSymbol)) && !doc.tokenizeOnTheseRegExp.test(wordOrSymbol) && !escapedPunctuation.test(wordOrSymbol) && !doc.wordExternalPunctuationRegExp.test(wordOrSymbol) && wordOrSymbol !== '.' && wordOrSymbol !== '‘' && wordOrSymbol !== ',' && wordOrSymbol !== '—') {
          if (!doc.tokenizeOnTheseRegExp.test(regExpEscape(wordOrSymbol)) && !doc.tokenizeOnTheseRegExp.test(wordOrSymbol) && !doc.wordExternalPunctuationRegExp.test(regExpEscape(wordOrSymbol)) && wordOrSymbol !== '-' && wordOrSymbol !== ',') {
            orthographicWords.push(wordOrSymbol);
            // console.log("This is probably a word: " + wordOrSymbol);

          } else {
            // console.log("This is probably not a word: " + wordOrSymbol);
          }

        } else {
          var extraTokens = wordOrSymbol.split(' ');
          if (extraTokens.length === 1 /* there was no word external punctuation */ ) {
            orthographicTokens.push(wordOrSymbol);
            orthographicWords.push(wordOrSymbol);
            // console.log("This is probably a real  word: " + wordOrSymbol);

          } else {
            for (var token in extraTokens) {
              if (!escapedPunctuation.test(extraTokens[token]) && !doc.wordExternalPunctuationRegExp.test(extraTokens[token]) /* this is the word */ ) {
                orthographicTokens.push(extraTokens[token]);
                // console.log("This is also probably a word: " + extraTokens[token]);
                orthographicWords.push(extraTokens[token]);
              } else {
                orthographicTokens.push(extraTokens[token]);
              }
            }
          }
        }
      }
    });

    doc.punctuationArray = punctuationArray;
    doc.orthographyArray = orthographicTokens;
    doc.orthographicWords = orthographicWords;
    return doc;

  };

  exports.Tokenizer = {
    tokenizeInput: tokenizeInput,
  };
  exports.Corpus2Morphology = exports.Corpus2Morphology || Corpus2Morphology;

})(typeof exports === 'undefined' ? this : exports);
