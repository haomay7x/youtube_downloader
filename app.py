from flask import Flask, render_template, request, redirect, url_for, send_file, jsonify, after_this_request
import yt_dlp, os, time, threading

app = Flask(__name__, static_folder='static', template_folder="temp")

@app.route('/')
def home():
    return redirect(url_for('index'))

@app.route('/index')
def index():
    return render_template('index.html')

@app.route('/download', methods=['POST'])
def download():
    data = request.get_json()
    received_url = data.get('url')
    received_format = data.get('format')
    received_quality = data.get('quality')

    timestamp = time.time()
    local_time_struct = time.localtime(timestamp)
    formatted_time = time.strftime("%Y-%m-%d", local_time_struct)

    output_filename = f"haomedia_{formatted_time}_{received_quality}"

    YDL_OPTIONS = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': f'{output_filename}.%(ext)s',
        'restrictfilenames': False,  # Ключ: позволяет пробелы, скобки, | и т.д.
        'noplaylist': True,
        'ffmpeg_location': 'C:/ffmpeg/bin'
    }

    if received_format == 'mp3':
        YDL_OPTIONS['format'] = 'bestaudio/best'
        YDL_OPTIONS['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': received_quality,
        }]
        final_ext = 'mp3'
    else:  # mp4 video
        height_map = {'high': 1080, 'medium': 720, 'low': 480}
        max_height = height_map.get(received_quality, 1080)
        YDL_OPTIONS['format'] = f'bestvideo[height<={max_height}][ext=mp4]+bestaudio[ext=m4a]/best[height<={max_height}]'
        final_ext = 'mp4'

    try:
        with yt_dlp.YoutubeDL(YDL_OPTIONS) as ydl: # type: ignore
            info = ydl.extract_info(received_url, download=True)

            title = info.get('title', 'Unknown Video')
            sanitized_title = "".join(c if c.isalnum() or c in " _-()[]" else "_" for c in title) # type: ignore

            quality_label = received_quality + 'kbps' if received_format == 'mp3' else {'high':'1080p', 'medium':'720p', 'low':'480p'}.get(received_quality, 'best')

            final_ext = 'mp3' if received_format == 'mp3' else 'mp4'
            new_filename = f"HaoMedia_{sanitized_title}_{formatted_time}_{quality_label}.{final_ext}"

            if received_format == 'mp3':
                final_path = f"{output_filename}.mp3"
            else:
                final_path = info.get('_filename') or ydl.prepare_filename(info)

            if os.path.exists(final_path):
                os.rename(final_path, new_filename)

            basename = new_filename

            return jsonify({'message': 'Ваш файл готов!', 'what': 'success', 'filename': basename}), 200
    except Exception as ex:
        return jsonify({'message': f'Ошибка! {ex}', 'what': 'error'}), 400

@app.route('/get_file/<filename>')
def get_file(filename):
    file_path = os.path.join(os.getcwd(), filename)
    if not os.path.exists(file_path):
        return jsonify({'message': 'Файл не найден', 'what': 'error'}), 404
    
    # Удаление файла с компьтера
    @after_this_request
    def delayed_remove(path):
        time.sleep(360) # для безопастности
        try:
            if os.path.exists(path):
                os.remove(path)
                print("\033[1;32m" + "# ФАЙЛ УДАЛЕН!" + "\033[0m")
        except Exception as e:
            print(f"Ошибка удаления: {e}")
    
    threading.Thread(target=delayed_remove, args=(file_path,), daemon=True).start()
    
    return send_file(file_path, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=7070)