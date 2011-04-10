var connectionDelegate = {}

function __hex (hexdata) {
    var data = hexdata.replace (/([a-f0-9]){2}/ig, function (x) {
        return String.fromCharCode (parseInt (x, 16))
    })

    return data
}

// event must be one of following: fail, recv, response, sent, finish
function add_connection_handler (connid, event, func) {
    if (! connectionDelegate[connid])
        connectionDelegate[connid] = {}
    connectionDelegate[connid][event] = func
}

function connectionDidFailWithError (connid, err) {
    var hndl = connectionDelegate[connid]
    if (hndl && hndl.fail) {
        hndl.fail (connid, err)
    } else {
        $("pre").append ("\nconnectionDidFailWithError: " + connid + ": " + err)
    }
}

function connectionDidReceiveData (connid, data) {
    var hndl = connectionDelegate[connid]
    if (hndl && hndl.recv) {
        hndl.recv (connid, data)
    } else {
        $("pre").append ("\nconnectionDidReceiveData: " + connid + ": " + data)
    }
}

function connectionDidReceiveResponse (connid) {
    var hndl = connectionDelegate[connid]
    if (hndl && hndl.response) {
        hndl.response (connid)
    } else {
        $("pre").append ("\nconnectionDidReceiveResponse: " + connid)
    }
}

function connectionDidSendBodyData (connid) {
    var hndl = connectionDelegate[connid]
    if (hndl && hndl.sent) {
        hndl.sent (connid)
    } else {
        $("pre").append ("\nconnectionDidSendBodyData: " + connid)
    }
}

function connectionDidFinishLoading (connid) {
    var hndl = connectionDelegate[connid]
    if (hndl && hndl.finish) {
        hndl.finish (connid)
    } else {
        $("pre").append ("\nconnectionDidFinishLoading: " + connid)
    }
}

////////////////////

function create_stack () {
    return []
}

function stack_push_raw_string (st, val) {
    st.push ("-" + val)
}

function stack_push_operator (st, op) {
    st.push ("@" + op)
}

function hexify (str) {
    var hex = ""
    for (var i = 0; i < str.length; i ++) {
        hex += str.charCodeAt (i).toString (16)
    }

    return hex
}

function stack_push_string (st, op) {
    if (typeof (op) != "string")
        op = op.toString ()

    if (op.match (/^[a-zA-Z0-9!@#$%^&*()_+{}|\[\]\:";'<>?,]*$/)) {
        stack_push_raw_string (st, op)
    } else {
        stack_push_raw_string (st, hexify (op))
        stack_push_operator (st, "hexstr")
        stack_push_operator (st, "str")
    }
}

function stack_push_data (st, op) {
    if (typeof (op) != "string")
        op = op.toString ()

    stack_push_raw_string (st, hexify (op))
    stack_push_operator (st, "hexstr")
}

function stack_execute (st) {
    var uri = "bridge:///" + st.join ("/")

    setTimeout (function () {
        location.href = uri
    }, 100)
}

JSBridgeStack = function () {
    this.stack = create_stack ()
}

JSBridgeStack.prototype.push = function () {
    for (var i = 0; i < arguments.length; i ++) {
        stack_push_string (this.stack, arguments[i])
    }
    return this
}

JSBridgeStack.prototype.pushdata = function () {
    for (var i = 0; i < arguments.length; i ++) {
        stack_push_data (this.stack, arguments[i])
    }
    return this
}

JSBridgeStack.prototype.operate = function (op) {
    stack_push_operator (this.stack, op)
    return this
}

JSBridgeStack.prototype.pushcallback = function (name, numargs) {
    return this.push (name, numargs).operate ("callback")
}

JSBridgeStack.prototype.execute = function () {
    stack_execute (this.stack)
}

///////////////////

function init () {
    $(document).ready (function () {
        $("pre").text ("ready")

        var jsb = new JSBridgeStack ()
        jsb.push (123, 456).operate ("add").push ("hoge", 1).operate ("callback").execute ()
    })
}

function hoge (x) {
    $("pre").append ("\n" + x)

    var jsb = new JSBridgeStack ()
    jsb.push ("hoge", "key").operate ("hmac_sha1").operate ("base64data").operate ("print").push ("hoge2", 0).operate ("callback").execute ()
}

function hoge2 () {
    $("pre").append ("\n" + "hoge2")

    var url = "http://scrw.in/"
    var jsb = new JSBridgeStack ()
    jsb.push ("Value1", "X-Scrw-Key1", "Value2", "X-Scrw-Key2", 2, url).operate ("http_post").push ("hoge3", 1).operate ("callback").execute ()
}

function hoge3 (connid) {
    $("pre").append ("\n" + "hoge3: conn ID: " + connid)

    var mesg = '<chat-entry room="opakapaka"><from><user-by-nickname><string>Toru</string></user-by-nickname><avatar-image><string>http://www.gravatar.com/avatar/5efc507a8db7167e2db7889a5597a3cd?s=40&amp;default=identicon</string></avatar-image></from><content><string>konichiwa</string></content></chat-entry>'

    var jsb = new JSBridgeStack ()
    jsb.pushdata (mesg).push ("Value1", "X-Scrw-Key1", "Value2", "X-Scrw-Key2", 2, "http://scrw.in/push.cgi").operate ("http_post").operate ("print").execute ()
}

// init ();

function escape_utf8 (str) {
    return encodeURIComponent (str)
}

function oauth_make_signature_base (url, method, params, request_body) {
    var params_sorted = []
    for (var i in params) {
        params_sorted.push ([i, params[i]])
    }
    params_sorted.sort (function (a, b) {return a > b ? 1 : -1})

    console.debug (params_sorted)

    var body = $.map (params_sorted, function (a) {
        return a[0] + "=" + escape_utf8 (a[1])
    }).join ("&")

    if (request_body)
        body += "&" + request_body

    var base = $.map ([method, url, body], escape_utf8).join ("&")

    return base
}

CALLBACK = []
var GLOBAL = this
function make_callback (func) {
    CALLBACK.push (func)
    var name = "CALLBACK_" + (CALLBACK.length - 1).toString ()
    GLOBAL[name] = func
    return name
}

function test_twitter_oauth () {
    var consumer_secret = "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98"
    var url = "https://api.twitter.com/oauth/request_token"
    var method = "POST"
    var params = {
        oauth_callback: "http://localhost:3005/the_dance/process_callback?service_provider_id=11",
        oauth_consumer_key: "GDdmIQH6jhtmLUypg82g",
        oauth_nonce: "QP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk",
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: "1272323042",
        oauth_version: "1.0"
    }

    var base = oauth_make_signature_base (url, method, params)
    console.assert (base == "POST&https%3A%2F%2Fapi.twitter.com%2Foauth%2Frequest_token&oauth_callback%3Dhttp%253A%252F%252Flocalhost%253A3005%252Fthe_dance%252Fprocess_callback%253Fservice_provider_id%253D11%26oauth_consumer_key%3DGDdmIQH6jhtmLUypg82g%26oauth_nonce%3DQP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1272323042%26oauth_version%3D1.0")

        // console.assert (sig == "8wUi7m5HFQy76nowoCThusfgB+Q=")

}

function disassemble_response (res) {
    var dest = {}
    var arr = res.split ("&")
    for (var i in arr) {
        var namevalue = arr[i].split ("=", 2)
        dest[namevalue[0]] = namevalue[1]
    }

    return dest
}

function http_post (url, header, body, cont) {
    var cb2 = make_callback (function (connhandle, connid) {
        var res = ""

        add_connection_handler (connid, "recv", function (connid, data) {
            res += data.toString ()
        })

        add_connection_handler (connid, "finish", function (connid) {
            if (cont)
                cont (res)
        })

        var jsb = new JSBridgeStack ()
        jsb.push (connhandle).operate ("http_send").execute ()
    })

    var jsb = new JSBridgeStack ()
    jsb.pushdata (body)
    var n = 0
    for (var f in header) {
        jsb.push (header[f], f)
        n ++
    }
    jsb.push (n, url).operate ("http_post").pushcallback (cb2, 2).execute ()
}

function make_oauth_header (params, sig) {
    var x = []
    for (var name in params) {
        var value = params[name]
        x.push (name + "=\"" + escape_utf8 (value) + "\"")
    }
    x.push ("oauth_signature" + "=\"" + escape_utf8 (sig) + "\"")
    var auth = "OAuth " + x.join (", ")

    return auth
}

function tweet (consumer_key, consumer_secret, oauth_token, oauth_token_secret, text, cont) {
    var params = {
        oauth_consumer_key: consumer_key,
        oauth_nonce: "tweet" + Date.now (),
        oauth_signature_method: "HMAC-SHA1",
        oauth_token: oauth_token,
        oauth_timestamp: Math.floor (Date.now () / 1000).toString (),
        oauth_version: "1.0"
    }

    var url = "http://api.twitter.com/1/statuses/update.json"
    var method = "POST"
    var body = "status=" + escape_utf8 (text)
    var base = oauth_make_signature_base (url, method, params, body)

    var jsb2 = new JSBridgeStack ()

    jsb2.push (base).push(consumer_secret + "&" + oauth_token_secret).operate ("hmac_sha1").operate ("base64data").pushcallback (make_callback (function (sig) {
        var auth = make_oauth_header (params, sig)

        http_post (url, {Authorization: auth}, body, function (res) {
            var data = eval ("(" + res + ")")

            if (cont)
                cont (data)
        })

    }), 1).execute ()
}

function request_token_params (consumer_key, oauth_cb) {
    var params = {
        oauth_callback: "bridge-callback://" + oauth_cb + "/",
        oauth_consumer_key: consumer_key,
        oauth_nonce: "hoge" + Date.now (),
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: Math.floor (Date.now () / 1000).toString (),
        oauth_version: "1.0"
    }

    return params
}

function access_token_params (consumer_key, oauth_token, oauth_verifier) {
    var params = {
        oauth_consumer_key: consumer_key,
        oauth_nonce: "hoge2" + Date.now (),
        oauth_signature_method: "HMAC-SHA1",
        oauth_token: oauth_token,
        oauth_timestamp: Math.floor (Date.now () / 1000).toString (),
        oauth_verifier: oauth_verifier,
        oauth_version: "1.0"
    }

    return params
}

function access_token (consumer_key, consumer_secret, oauth_token_secret, oauth_token, oauth_verifier, cont) {
    var params = access_token_params (consumer_key, oauth_token, oauth_verifier)

    var url = "https://api.twitter.com/oauth/access_token"
    var method = "POST"
    var base = oauth_make_signature_base (url, method, params)

    var jsb = new JSBridgeStack ()
    jsb.push (base, consumer_secret + "&" + oauth_token_secret).operate ("hmac_sha1").operate ("base64data").pushcallback (make_callback (function (sig) {
        var auth = make_oauth_header (params, sig)

        http_post (url, {Authorization: auth}, "", function (res) {
            var data = disassemble_response (res)

            if (cont) {
                cont (data.oauth_token, data.oauth_token_secret)
            }
        })

    }), 1).execute ()
}

function request_token (consumer_key, consumer_secret, cont) {
    var stat = {}

    var params = request_token_params (consumer_key, cont (stat))
    var url = "http://api.twitter.com/oauth/request_token"
    var method = "POST"
    var base = oauth_make_signature_base (url, method, params)

    var jsb = new JSBridgeStack ()
    jsb.push (base, consumer_secret + "&").operate ("hmac_sha1").operate ("base64data").pushcallback (make_callback (function (sig) {
        $("pre").append ("\n" + "test_twitter_oauth: signature: " + sig)

        var auth = make_oauth_header (params, sig)

        http_post (url, {Authorization: auth}, "", function (res) {
            var data = disassemble_response (res)
            stat.oauth_token_secret = data.oauth_token_secret

            var jsb = new JSBridgeStack ()
            jsb.push (data.oauth_token_secret, data.oauth_token).operate ("store_oauth_token").pushcallback (make_callback (function () {
                var jsb = new JSBridgeStack ()
                jsb.push ("http://api.twitter.com/oauth/authorize?oauth_token=" + data.oauth_token).operate ("open_url_in_new_browser").
                    pushcallback (make_callback (function (hndl) {
                        stat.browser_handle = hndl;
                    }), 1).execute ()
            }), 0).execute ()
        })
    }), 1).execute ()
}

function twitter_oauth () {
    var consumer_secret = "QBvGYz4yTwFx1tGabhbsxE3ZXmaG01h3VRjfJoph0"
    var consumer_key = "7IoQbg88rT3GJ01HlTOc9A"
    // var browser_handle
    // var oauth_token_secret
    var oauth_cb = function (stat) {
        return make_callback (function (data) {
            var browser_handle = stat.browser_handle
            var oauth_token_secret = stat.browser_handle

            var res = __hex (data)
            $("pre").append ("\n" + "OAuth callback: " + res)

            var jsb = new JSBridgeStack ()
            jsb.push ("OAuth callback: " + res).operate ("print").
                push (browser_handle).operate ("close_browser").
                execute ()

            var token = disassemble_response (res)

            access_token (consumer_key, consumer_secret, oauth_token_secret, token.oauth_token, token.oauth_verifier, function (oauth_token, oauth_token_secret) {
                var jsb = new JSBridgeStack ()
                jsb.push (oauth_token_secret, oauth_token).operate ("store_oauth_token").execute ()

                tweet (consumer_key, consumer_secret, oauth_token, oauth_token_secret, "setting up my twitter 私のさえずりを設定する " + Date.now (), function (res) {
                    $("pre").append ("\nTweet: " + res.id + " " + res)
                })
            })
        })
    }

    request_token (consumer_key, consumer_secret, oauth_cb)

    // var params = request_token_params (consumer_key, oauth_cb)
    // var url = "http://api.twitter.com/oauth/request_token"
    // var method = "POST"
    // var base = oauth_make_signature_base (url, method, params)

    // var jsb = new JSBridgeStack ()
    // jsb.push (base, consumer_secret + "&").operate ("hmac_sha1").operate ("base64data").pushcallback (make_callback (function (sig) {
    //     $("pre").append ("\n" + "test_twitter_oauth: signature: " + sig)

    //     var auth = make_oauth_header (params, sig)

    //     http_post (url, {Authorization: auth}, "", function (res) {
    //         var data = disassemble_response (res)
    //         oauth_token_secret = data.oauth_token_secret

    //         var jsb = new JSBridgeStack ()
    //         jsb.push (data.oauth_token_secret, data.oauth_token).operate ("store_oauth_token").pushcallback (make_callback (function () {
    //             var jsb = new JSBridgeStack ()
    //             jsb.push ("http://api.twitter.com/oauth/authorize?oauth_token=" + data.oauth_token).operate ("open_url_in_new_browser").
    //                 pushcallback (make_callback (function (hndl) {
    //                     browser_handle = hndl;
    //                 }), 1).execute ()
    //         }), 0).execute ()
    //     })
    // }), 1).execute ()
}

$(document).ready (function () {
    try {
        twitter_oauth ()
    } catch (err) {
        alert (err)
    }
})
